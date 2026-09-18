/**
 * Two claims the front page now makes, checked against a real cold signup.
 *
 *   1. "Tomorrow at six" — six in THEIR morning. The browser is run in a
 *      non-Central zone, a stranger is taken through intake, and the timezone
 *      that was actually stored on their row is read back and fed to the real
 *      isDue from api/morning.ts. Nothing here trusts that the client read the
 *      right zone; it reads what the database kept.
 *
 *   2. "Five minutes" — timed. A machine types instantly, so what this measures
 *      is the FLOOR: the waits a person cannot type their way out of, plus the
 *      transitions. A human's number is this plus their own writing. If the
 *      floor alone is near five minutes the copy is wrong.
 *
 *   ZONE=Asia/Tokyo node scripts/verify-intake-live.mjs
 */
import { probe } from './lib/probe.mjs';
import { toReveal } from './lib/journey.mjs';
import { bundled, SERVERLESS } from './lib/bundle.mjs';

const URL_ = process.env.SOVRN_URL ?? 'http://localhost:5173';
const ZONE = process.env.ZONE ?? 'Europe/Berlin';
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

if (!SUPA_URL || !SUPA_KEY) {
  console.error('  VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be in the environment.');
  process.exit(1);
}

const { isDue } = await bundled('api/morning.ts', { external: SERVERLESS });

const email = `tz-${Date.now()}@sovrn-verify.invalid`;

await probe(
  /* probe() spreads its unknown options straight into newContext, so the zone
     goes at the top level — nested under a `contextOptions` key it is silently
     dropped and the run quietly measures Central. */
  { url: URL_, name: `intake-${ZONE.replace(/\//g, '-')}`, timezoneId: ZONE },
  async ({ page, url }) => {
    console.log(`\n  Browser clock: ${ZONE}\n`);

    const reported = await (async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    })();
    check('the browser reports the emulated zone', reported === ZONE, reported);

    /* ── Timed, with nothing typed by a person ───────────────────────────── */
    const t0 = Date.now();
    await toReveal(page, url, { email });
    const floor = Date.now() - t0;

    const mins = Math.floor(floor / 60000);
    const secs = Math.round((floor % 60000) / 1000);
    console.log(`\n  Intake floor, voice off, machine typing: ${mins}m ${String(secs).padStart(2, '0')}s\n`);
    check('the floor leaves room inside five minutes', floor < 5 * 60_000,
      `${(floor / 1000).toFixed(1)}s of 300s`);
    check('and is not so close that a slow typist blows through it', floor < 3 * 60_000,
      `${(floor / 1000).toFixed(1)}s of 180s — a person adds their own writing on top`);

    /* ── What the row actually kept ──────────────────────────────────────── */
    const row = await page.evaluate(async ([supaUrl, supaKey]) => {
      const raw = localStorage.getItem('sovrn_auth');
      if (!raw) return { error: 'no session' };
      const tok = JSON.parse(raw);
      const at = tok.access_token ?? tok?.currentSession?.access_token;
      const uid = tok.user?.id ?? tok?.currentSession?.user?.id;
      if (!at || !uid) return { error: 'no token' };
      const r = await fetch(`${supaUrl}/rest/v1/users?select=timezone,consent_at&id=eq.${uid}`, {
        headers: { apikey: supaKey, Authorization: `Bearer ${at}`, Accept: 'application/json' },
      });
      if (!r.ok) return { error: `rest ${r.status}` };
      const rows = await r.json();
      return rows[0] ?? { error: 'no row' };
    }, [SUPA_URL, SUPA_KEY]);

    check('consent was stamped', Boolean(row?.consent_at), row?.error ?? String(row?.consent_at));
    check('the stored timezone is theirs, not the server\'s',
      row?.timezone === ZONE, row?.error ?? String(row?.timezone));

    /* ── And the send rule, run on what was stored ───────────────────────── */
    if (row?.timezone) {
      const at6 = (() => {
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: row.timezone, hour12: false,
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        for (let g = -14; g <= 14; g += 0.25) {
          const t = new Date(Date.UTC(2026, 8, 19, 6, 2) - g * 3600_000);
          const p = Object.fromEntries(fmt.formatToParts(t).filter((x) => x.type !== 'literal')
            .map((x) => [x.type, x.value]));
          if (+p.hour === 6 && +p.minute === 2 && +p.day === 19) return t;
        }
        return null;
      })();
      check('isDue fires at their 06:02 using the stored value', at6 !== null && isDue(row.timezone, at6));
      const central6 = new Date(Date.UTC(2026, 8, 19, 11, 2));   // 06:02 CDT
      check('and not at Central 06:02', !isDue(row.timezone, central6),
        `their hour then is ${new Intl.DateTimeFormat('en-US', { timeZone: row.timezone, hour12: false, hour: '2-digit' }).format(central6)}`);
    }
  });

console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
