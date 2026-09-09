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
 *   node scripts/verify-deploy.mjs --url https://www.sovrn.online [--timeout 300]
 */
import { createHash } from 'node:crypto';
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

const files = (await walk(DIST)).map((f) => '/' + relative(DIST, f).split('\\').join('/'));
const stable = files.filter((f) => !isFingerprinted(f));
const hashed = files.filter(isFingerprinted);

const local = new Map();
for (const path of stable) local.set(path, sha(await readFile(join(DIST, path.slice(1)))));

console.log(`verify-deploy: ${ORIGIN}`);
console.log(`  ${stable.length} stable-path files to compare, ${hashed.length} fingerprinted to confirm present`);

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
    const remote = sha(Buffer.from(await res.arrayBuffer()));
    if (remote !== local.get(path)) mismatched.push(path);
  }

  for (const path of hashed) {
    const res = await fetch(`${ORIGIN}${path}`, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) missing.push(`${path} (${res.status})`);
  }

  if (!mismatched.length && !missing.length) {
    const secs = Math.round((Date.now() - started) / 1000);
    console.log(`\n  every file matches after ${secs}s (${attempt} check${attempt === 1 ? '' : 's'})`);
    for (const path of stable) console.log(`    ok  ${path}  ${local.get(path)}`);
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
