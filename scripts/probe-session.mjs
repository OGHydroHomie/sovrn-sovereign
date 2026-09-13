/**
 * Mint a real session and hand its token to the shell.
 *
 * For verifying a deployed endpoint against real rows: the account is a real
 * anonymous account created by loading the real site, and the token is the one
 * the app itself holds. `--release` deletes it again through /delete.
 */
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { probe, deleteRecorded, stateFile } from './lib/probe.mjs';
import { chromium } from 'playwright';

const URL_ = process.env.SOVRN_URL ?? 'https://www.sovrn.online';
const OUT = 'scripts/.session-token.json';

if (process.argv.includes('--release')) {
  const browser = await chromium.launch();
  try {
    const prior = JSON.parse(await readFile(stateFile('session'), 'utf8'));
    console.log(`  account: ${await deleteRecorded(browser, prior)}`);
    await unlink(stateFile('session')).catch(() => {});
    await unlink(OUT).catch(() => {});
  } finally {
    await browser.close();
  }
} else {
  await probe({ url: URL_, name: 'session', keep: true }, async ({ page, url }) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    const session = await page.waitForFunction(() => {
      /* The client is configured with its own storageKey — `sovrn_auth`, not
         supabase's default `sb-<ref>-auth-token`. Guessing the default waited
         thirty seconds and found nothing on a page that was signed in. */
      try {
        const v = JSON.parse(localStorage.getItem('sovrn_auth') ?? 'null');
        return v?.access_token && v?.user?.id ? { token: v.access_token, uid: v.user.id } : null;
      } catch { return null; }
    }, null, { timeout: 30000, polling: 400 }).then((h) => h.jsonValue());
    /* Recorded by hand as well, because keep:true switches off the automatic
       recording that would otherwise let the next run clear this account. */
    const storage = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('sovrn_'))
        .map((k) => [k, localStorage.getItem(k)]));
    await writeFile(stateFile('session'), JSON.stringify({ url, at: new Date().toISOString(), storage }));
    await writeFile(OUT, JSON.stringify(session));
    console.log(`  uid ${session.uid}`);
  });
}
