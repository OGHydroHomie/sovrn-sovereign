/**
 * The Mirror, on the Ledger, at 375px.
 *
 * A real account with real filings, written through PostgREST under RLS. The
 * composition is the real module and the real model call — only the database
 * read inside the endpoint is replaced, because SUPABASE_SECRET_KEY is not on
 * this machine and should not be. Both gates run, as they do in the endpoint.
 *
 *   SHOTS=/tmp/x node scripts/probe-mirror.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { probe } from './lib/probe.mjs';
import { seedTwoCycles } from './lib/journey.mjs';
import { bundled, SERVERLESS } from './lib/bundle.mjs';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n')
  .filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const { readFilings, composeMirror } = await bundled('api/_mirror.ts', { external: SERVERLESS });
const { findInventedClaims } = await bundled('api/_grounding.ts', { external: SERVERLESS });
const { safetyCheck } = await bundled('api/_safety.ts', { external: SERVERLESS });

const URL_ = process.env.SOVRN_URL ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS ?? null;
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/* Filings across two cycles, because the Mirror and the Devil read the same
   evidence and inside one cycle the Devil wins. Two filed misses against one
   target is a binding and gets a card; the same four sentences spread over a
   closed cycle and a new one is just a person who keeps talking about
   themselves the same way, which is what the Mirror is for. The seven-day
   window does not care where the cycle boundary is. */
const OLD = [
  { kind: 'miss', text: 'I got scared. Opened the doc and closed it again.' },
  { kind: 'miss', text: 'chickened out at the last minute, again' },
  { kind: 'miss', text: "Honestly it was too big for one afternoon, I didn't know where to start." },
];
const NOW = [
  { kind: 'miss', text: "I wasn't ready. Need more time with it first." },
  { kind: 'open' },
];
const DAYS = [...OLD, ...NOW];

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

/* Against a deployment, the endpoint answers for itself. Locally it cannot:
   /api/mirror reads the database with the service key, which is not on this
   machine, so the composition and both gates run here instead and only the read
   is replaced. */
const LIVE = Boolean(process.env.LIVE);

await probe({ url: URL_, name: 'mirror' }, async ({ page, url }) => {
  if (!LIVE) await page.route('**/api/mirror', async (route) => {
    const filings = DAYS
      .filter((d) => d.text)
      .map((d, i) => ({ day_number: i + 1, what_happened: d.text, completed: false }));
    const readings = await readFilings(client, filings);
    const mirror = composeMirror(readings);
    let out = { mirror: null };
    if (mirror) {
      const [invented, safe] = await Promise.all([
        findInventedClaims(client, { filings: filings.map((f) => f.what_happened) }, mirror.text, 'mirror'),
        safetyCheck(client, mirror.text, 'mirror'),
      ]);
      check('the gates pass it', invented.length === 0 && safe,
        `${invented.length} flagged, safety ${safe ? 'ok' : 'blocked'}`);
      if (invented.length === 0 && safe) {
        out = { mirror: { lead: mirror.lead, quotes: mirror.quotes, tally: mirror.tally, close: mirror.close } };
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });

  const seeded = await seedTwoCycles(page, url, {
    supa: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_PUBLISHABLE_KEY,
    closed: OLD, open: NOW,
  });
  check('a real record, written by the account itself', !seeded.error, seeded.error ?? seeded.made);
  if (seeded.error) return;

  await page.goto(`${url}/ledger`, { waitUntil: 'networkidle' });
  const mirror = page.locator('[data-mirror]');
  await mirror.first().waitFor({ timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(600);

  check('a Mirror is on the Ledger', await mirror.count() === 1);
  check('and no trial with it', await page.locator('[data-trial]').count() === 0);

  const text = (await mirror.innerText()).replace(/\s+/g, ' ');
  console.log(`\n${(await mirror.innerText()).split('\n').filter(Boolean).map((l) => `      ${l}`).join('\n')}\n`);

  /* Every quotation mark on screen has to hold the person's own words. */
  const quoted = [...text.matchAll(/[“"]([^”"]+)[”"]/g)].map((m) => m[1].trim());
  const sources = DAYS.filter((d) => d.text).map((d) => d.text.replace(/\s+/g, ' '));
  check('every quote on screen is in a filing, character for character',
    quoted.length > 0 && quoted.every((q) => sources.some((s) => s.includes(q))),
    quoted.map((q) => JSON.stringify(q)).join(' '));

  check('it is one observation, not a list',
    (text.match(/times you|Once you|Twice you/g) ?? []).length <= 2);

  /* Above the act, never instead of it. */
  const geometry = await page.evaluate(() => {
    const m = document.querySelector('[data-mirror]');
    const label = [...document.querySelectorAll('p')]
      .find((el) => /^DAY \d+ · Committed .* · Open$/.test((el.textContent ?? '').trim()));
    return m && label
      ? { bottom: m.getBoundingClientRect().bottom, actTop: label.getBoundingClientRect().top }
      : null;
  });
  check('the act is still there, underneath it', !!geometry && geometry.actTop >= geometry.bottom - 4,
    geometry ? `mirror ends at ${Math.round(geometry.bottom)}px, act begins at ${Math.round(geometry.actTop)}px` : 'act not found');

  const contrast = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
        .map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const behind = (el) => {
      let node = el;
      while (node && node !== document.documentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg;
        node = node.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    return [...document.querySelector('[data-mirror]').querySelectorAll('p')]
      .filter((el) => (el.textContent ?? '').trim())
      .map((el) => {
        const cs = getComputedStyle(el);
        const a = lum(cs.color), b = lum(behind(el));
        return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), size: parseFloat(cs.fontSize) };
      });
  });
  const worst = contrast.reduce((a, b) => (a.ratio < b.ratio ? a : b));
  check('every word clears 4.5:1', worst.ratio >= 4.5, `worst ${worst.ratio.toFixed(2)}:1 at ${worst.size}px`);

  if (SHOTS) {
    await mkdir(SHOTS, { recursive: true });
    await page.screenshot({ path: `${SHOTS}/mirror.png`, fullPage: true });
  }
});

console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
