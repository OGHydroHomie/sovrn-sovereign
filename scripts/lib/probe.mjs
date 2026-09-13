/**
 * A browser session that always cleans up after itself.
 *
 * The full check has done this correctly for a while: it records the account it
 * is using the moment the app mints one, deletes it through the product's own
 * /delete flow in a `finally`, and sweeps whatever a killed run left behind the
 * next time it starts. Every throwaway probe written alongside it has not, and
 * three separate times orphaned anonymous accounts have had to be swept out of
 * production by hand — the last batch was a hundred and twenty-seven.
 *
 * The machinery lives here now so a probe gets it by importing it rather than by
 * remembering to write it. Any Playwright script that opens this product should
 * go through `probe()`.
 *
 *   import { probe } from './lib/probe.mjs';
 *   await probe({ url: 'http://localhost:5173' }, async ({ page }) => {
 *     await page.goto(url);
 *     // ...
 *   });
 *
 * Every context it opens mints an anonymous identity simply by loading the app,
 * which is why "I only took a screenshot" still leaves a row behind.
 */
import { chromium } from 'playwright';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, '..');

/** One file per name, so two probes cannot clear each other's account. */
export const stateFile = (name = 'probe') => join(STATE_DIR, `.${name}-session.json`);

/** Drive the product's own delete flow on a page that holds the session. */
export async function deleteVia(page, url) {
  await page.goto(`${url}/delete`, { waitUntil: 'networkidle', timeout: 60000 });
  const start = page.getByRole('button', { name: /^delete my data$/i }).first();
  if (!(await start.isVisible().catch(() => false))) return 'nothing to delete';
  await start.click();
  await page.getByRole('button', { name: /yes, delete everything/i }).first().click();
  await page.getByText(/your data has been deleted/i).waitFor({ timeout: 30000 });
  return 'deleted';
}

/**
 * The same flow in a throwaway context seeded with a session from disk — how a
 * previous run's account is reached from a browser that never had it.
 */
export async function deleteRecorded(browser, session) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((entries) => {
    try {
      for (const [k, v] of entries) localStorage.setItem(k, v);
    } catch { /* about:blank has no usable storage */ }
  }, session.storage);
  try {
    return await deleteVia(await ctx.newPage(), session.url);
  } finally {
    await ctx.close();
  }
}

/** Record the account in play, the moment it exists. */
export async function rememberSession(page, url, name) {
  const storage = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sovrn_'))
      .map((k) => [k, localStorage.getItem(k)]));
  if (!storage.length) return false;
  await mkdir(STATE_DIR, { recursive: true }).catch(() => {});
  await writeFile(stateFile(name), JSON.stringify({ url, at: new Date().toISOString(), storage }));
  return true;
}

/** Clear whatever a previous run of this name left behind. */
export async function sweepPrevious(browser, url, name) {
  let prior = null;
  try { prior = JSON.parse(await readFile(stateFile(name), 'utf8')); } catch { return 'nothing recorded'; }
  if (prior.url !== url) return `recorded against ${prior.url}; left alone`;
  try {
    const outcome = await deleteRecorded(browser, prior);
    await unlink(stateFile(name)).catch(() => undefined);
    return `${outcome} (recorded ${prior.at})`;
  } catch (err) {
    return `FAILED — ${String(err).split('\n')[0].slice(0, 90)}`;
  }
}

/**
 * Wait for a step to settle — either way — and say which.
 *
 * Every generated step in this product has two outcomes and the harnesses only
 * ever waited for one of them. When a call failed, the page said "That didn't go
 * through — try again" and the check went on waiting for a button that was never
 * coming, then died on a timeout that looked like slowness. Four times. Twice I
 * reported the generator as slow on that evidence; it was not slow, it was a
 * transient failure nobody was looking at.
 *
 * `ok` and `bad` are locators. Whichever resolves first decides, and a failure
 * throws immediately with the page's own words plus whatever the network and the
 * console said — so the next one of these diagnoses itself instead of costing a
 * two-minute timeout and a guess.
 */
export async function settles(page, { ok, bad, what, timeout = 120000 }) {
  const outcome = await Promise.race([
    ok.first().waitFor({ state: 'visible', timeout }).then(() => 'ok'),
    bad.first().waitFor({ state: 'visible', timeout }).then(() => 'bad'),
  ]).catch(() => 'timeout');

  if (outcome === 'ok') return;

  /* Bounded. Reading an element that is not there carries Playwright's own
     thirty-second default, which turned a twenty-second timeout into fifty and
     printed nothing useful at the end of it. */
  const said = await bad.first().innerText({ timeout: 1500 }).catch(() => '');
  const trouble = (page.__apiLog ?? []).filter((r) => r.status >= 400 || r.failed);
  const warned = (page.__consoleLog ?? []).filter((l) => /fail|error|warn/i.test(l));
  throw new Error(
    `${what}: ${outcome === 'bad' ? `the page said ${JSON.stringify(said.trim())}` : `nothing settled in ${timeout}ms`}`
    + (trouble.length ? `\n    network: ${trouble.map((r) => `${r.status || 'FAILED'} ${r.url}`).join(', ')}` : '')
    + (warned.length ? `\n    console: ${warned.slice(-3).join(' | ')}` : '')
  );
}

/** Record what the product's own calls did, so a failure can name itself. */
export function watch(page) {
  page.__apiLog = [];
  page.__consoleLog = [];
  page.on('response', (res) => {
    if (!res.url().includes('/api/')) return;
    page.__apiLog.push({ url: new URL(res.url()).pathname, status: res.status() });
  });
  page.on('requestfailed', (req) => {
    if (!req.url().includes('/api/')) return;
    page.__apiLog.push({ url: new URL(req.url()).pathname, failed: req.failure()?.errorText ?? 'failed' });
  });
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') page.__consoleLog.push(m.text().slice(0, 160));
  });
}

/**
 * Run a probe against the product with the account handled at both ends.
 *
 * `fn` is given { page, context, browser, url }. Whatever it does or throws, the
 * account is deleted on the way out; if that delete itself fails the record is
 * deliberately left on disk so the next run finishes the job.
 */
export async function probe(options, fn) {
  const {
    url = 'http://localhost:5173',
    name = 'probe',
    viewport = { width: 375, height: 800 },
    deviceScaleFactor = 1,
    keep = false,
    ...contextOptions
  } = options ?? {};

  const browser = await chromium.launch();
  const swept = await sweepPrevious(browser, url, name);
  if (!/nothing recorded/.test(swept)) console.log(`  [probe] previous session: ${swept}`);

  const context = await browser.newContext({ viewport, deviceScaleFactor, ...contextOptions });
  const page = await context.newPage();
  watch(page);

  /* The identity is minted on the first load, so the record is written as soon
     as one exists rather than when the probe happens to be finished with it. */
  let recorded = false;
  page.on('load', () => {
    if (recorded || keep) return;
    recorded = true;
    void rememberSession(page, url, name).catch(() => { recorded = false; });
  });

  try {
    return await fn({ page, context, browser, url });
  } finally {
    if (!keep) {
      try {
        const outcome = await deleteVia(page, url);
        await unlink(stateFile(name)).catch(() => undefined);
        console.log(`  [probe] account: ${outcome}`);
      } catch (err) {
        console.log(`  [probe] account NOT deleted — the next run will clear it. ${String(err).split('\n')[0].slice(0, 80)}`);
      }
    }
    await browser.close();
  }
}
