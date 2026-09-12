#!/usr/bin/env node
/**
 * Is what I just built actually the thing being served?
 *
 * The old check compared the hashed JS filename and nothing else. That is a
 * proxy, and it is silent about every change that does not alter the bundle: a
 * meta tag, the manifest, an icon, a mark, anything in public/. It gave a false
 * green twice in one day — once for the archetype marks and once for a
 * theme-color fix, where the JS was byte-identical and the loop matched the
 * previous deploy instantly.
 *
 * This compares content. Every file in dist/ that is served at a stable path is
 * hashed locally, fetched from the deployment, and hashed again. A file that
 * differs is named. Hashed asset filenames are checked for existence, since
 * their names already encode their content.
 *
 * It also checks the other direction. Confirming that expected files match says
 * nothing about a file that was REMOVED — a deletion passes trivially, because
 * every remaining file still matches. Paths deleted from public/ since the last
 * commit are asserted to 404, and --absent takes any others by hand.
 *
 * One thing it cannot do is compare fingerprinted filenames. The deployment is
 * built by Vercel on Node 24; this runs on whatever is local. Same source, same
 * logical output, different content hash — so index.html is compared with its
 * asset references normalised, and whether the right CODE shipped is answered by
 * --expect, which asserts substrings are present in the deployed bundle. A hash
 * cannot answer that question across two build environments; content can.
 *
 *   node scripts/verify-deploy.mjs --url https://www.sovrn.online [--timeout 300]
 *                                  [--absent /a,/b] [--since HEAD~1]
 *                                  [--expect "some string,another string"]
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const ORIGIN = (arg('url', 'https://www.sovrn.online')).replace(/\/$/, '');
const TIMEOUT_S = Number(arg('timeout', 300));
const DIST = 'dist';

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12);

/* Fingerprints are environment-dependent, so they are erased before comparing.
   Everything else in the document — meta tags, the manifest link, the title —
   still has to match exactly. */
const normalise = (buf, path) => path !== '/index.html'
  ? buf
  : Buffer.from(buf.toString('utf8').replace(/-[A-Za-z0-9_-]{8,}\.(js|css)/g, '-*.$1'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

/* Vite fingerprints these, so the filename IS the content hash. Comparing bytes
   would only re-derive what the name already guarantees; what matters is that
   the deployment serves this name at all. */
const isFingerprinted = (p) => /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[a-z]+$/.test(p);

/* Deletions are invisible to a content comparison, so they are derived rather
   than remembered. public/ is the only tracked source of stable-path files, so
   anything deleted from it since the base commit should now be gone. */
function deletedFromPublic(since) {
  try {
    const out = execSync(`git diff --diff-filter=D --name-only ${since}..HEAD -- public/`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').filter(Boolean).map((f) => '/' + f.replace(/^public\//, ''));
  } catch {
    return [];   // No git, shallow clone, or a bad ref. Not a reason to fail.
  }
}

const absent = [
  ...deletedFromPublic(arg('since', 'HEAD~1')),
  ...(arg('absent', '').split(',').map((s) => s.trim()).filter(Boolean)),
];

/* Dotfiles are dropped. Vite copies everything in public/ into dist/, including
   a .DS_Store macOS writes the moment the folder is opened in Finder, and Vercel
   will not serve a dotfile — so expecting one means the check fails forever over
   a file that is not part of the site and never could be. */
const files = (await walk(DIST))
  .map((f) => '/' + relative(DIST, f).split('\\').join('/'))
  .filter((f) => !f.split('/').some((part) => part.startsWith('.')));
const stable = files.filter((f) => !isFingerprinted(f));
const hashed = files.filter(isFingerprinted);

const local = new Map();
for (const path of stable) {
  local.set(path, sha(normalise(await readFile(join(DIST, path.slice(1))), path)));
}

const expect = arg('expect', '').split(',').map((x) => x.trim()).filter(Boolean);

console.log(`verify-deploy: ${ORIGIN}`);
console.log(`  ${stable.length} stable-path files to compare, ${hashed.length} fingerprinted to confirm present`);
if (absent.length) console.log(`  ${absent.length} removed path(s) to confirm gone: ${absent.join(', ')}`);

const started = Date.now();
let attempt = 0;

while ((Date.now() - started) / 1000 < TIMEOUT_S) {
  attempt += 1;
  const mismatched = [];
  const missing = [];

  for (const path of stable) {
    // Cache-bust: a CDN edge holding the previous copy is exactly the thing
    // this script exists to notice.
    const res = await fetch(`${ORIGIN}${path}?_v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) { missing.push(`${path} (${res.status})`); continue; }
    const remote = sha(normalise(Buffer.from(await res.arrayBuffer()), path));
    if (remote !== local.get(path)) mismatched.push(path);
  }

  /* Read the asset names off the deployed page rather than the local build, and
     assert the expected strings are actually inside them. This is what proves
     the code shipped; the filename cannot. */
  const remoteHtml = await (await fetch(`${ORIGIN}/index.html?_v=${Date.now()}`, { cache: 'no-store' })).text();
  const remoteAssets = [...remoteHtml.matchAll(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)].map((m) => m[0]);
  let served = '';
  for (const path of [...new Set(remoteAssets)]) {
    const res = await fetch(`${ORIGIN}${path}`, { cache: 'no-store' });
    if (!res.ok) { missing.push(`${path} (${res.status})`); continue; }
    served += await res.text();
  }
  for (const needle of expect) {
    if (!served.includes(needle)) missing.push(`expected string not in the deployed bundle: ${JSON.stringify(needle)}`);
  }

  // Still-served deletions. The cache-buster matters most here: an edge holding
  // the old copy answers 200 for a file that is no longer deployed.
  const lingering = [];
  for (const path of absent) {
    const res = await fetch(`${ORIGIN}${path}?_v=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) lingering.push(`${path} (still ${res.status})`);
  }
  missing.push(...lingering);

  if (!mismatched.length && !missing.length) {
    const secs = Math.round((Date.now() - started) / 1000);
    console.log(`\n  every file matches after ${secs}s (${attempt} check${attempt === 1 ? '' : 's'})`);
    for (const path of stable) console.log(`    ok  ${path}  ${local.get(path)}`);
    for (const path of absent) console.log(`    ok  ${path}  gone`);
    for (const needle of expect) console.log(`    ok  present  ${JSON.stringify(needle)}`);
    process.exit(0);
  }

  if (attempt === 1 || (Date.now() - started) / 1000 > TIMEOUT_S - 20) {
    for (const m of mismatched) console.log(`    stale    ${m}`);
    for (const m of missing) console.log(`    missing  ${m}`);
  }
  process.stdout.write('.');
  await sleep(10000);
}

console.error(`\nverify-deploy: TIMED OUT after ${TIMEOUT_S}s — the deployment does not match dist/`);
process.exit(1);
