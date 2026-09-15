/**
 * The map, at 375px.
 *
 * The real bundled api/map.ts against the in-memory PostgREST, because the page
 * has to show a record that takes weeks to accumulate: a freed figure, a trial
 * still running, a month of days with gaps in it, and cycles that have closed
 * three different ways. Waiting for that is not a test.
 *
 *   SHOTS=/tmp/x node scripts/probe-map.mjs
 */
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { probe } from './lib/probe.mjs';
import { seedRecord, seedTwoCycles } from './lib/journey.mjs';
import { fakeDb } from './lib/fake-postgrest.mjs';
import { bundled, SERVERLESS } from './lib/bundle.mjs';

const { default: handler } = await bundled('api/map.ts', { external: SERVERLESS });

const URL_ = process.env.SOVRN_URL ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS ?? null;
const UID = '11111111-1111-4111-8111-111111111111';

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n')
  .filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const day = (back) => new Date(Date.now() - back * 864e5).toISOString();

/* Thirty-one days: some crossed, some committed and not done, and real gaps —
   including a week where nothing was filed at all. */
const SHAPE = [
  'done', 'done', 'missed', 'done', 'empty', 'done', 'missed',
  'empty', 'empty', 'empty', 'empty', 'empty',
  'done', 'done', 'done', 'missed', 'done',
  'empty', 'missed', 'done', 'done', 'empty', 'done', 'done',
  'missed', 'empty', 'done', 'done', 'done', 'missed', 'done',
];

const entries = SHAPE.map((state, i) => {
  const at = day(SHAPE.length - i);
  return {
    id: `e${i}`, user_id: UID, day_number: i + 1,
    committed_at: at,
    filed_at: state === 'empty' ? null : at,
    completed_at: state === 'done' ? at : null,
  };
});

const store = fakeDb({
  trials: [
    { id: 't1', user_id: UID, cycle_id: 'c1', figure: 'devil', state: 'freed', freed_at: day(19) },
    { id: 't2', user_id: UID, cycle_id: 'c3', figure: 'hermit', state: 'active', freed_at: null },
    /* Rejected: not freed, not active, and therefore not on the map at all. */
    { id: 't3', user_id: UID, cycle_id: 'c2', figure: 'sun', state: 'rejected', freed_at: null },
  ],
  cycles: [
    { id: 'c1', user_id: UID, cycle_number: 1, opened_at: day(31),
      target_admitted: 'Write a one-page paid offer and send it to three people who could hire you.',
      close_reason: 'crossed', closed_at: day(19) },
    { id: 'c2', user_id: UID, cycle_number: 2, opened_at: day(18),
      target_admitted: 'Finish the second chapter and send it to the editor.',
      close_reason: 'expired', closed_at: day(8) },
    { id: 'c3', user_id: UID, cycle_number: 3, opened_at: day(7),
      target_admitted: 'Call the three people who asked and give them a price.',
      close_reason: null, closed_at: null },
  ],
  ledger_entries: entries,
  users: [{ id: UID, timezone: 'Europe/London' }],
});

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

await store.listen().then((url) => {
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = 'service-role-fixture';
});

/* Against a deployment the endpoint answers for itself, reading the real
   database. What cannot be seeded from a browser is a freed figure — trials are
   select-own under RLS and are written by the server — so the live pass covers
   the days, the cycles, the locks and the refusals, and the freed and active
   states are covered locally against the same handler. */
const LIVE = Boolean(process.env.LIVE);

await probe({ url: URL_, name: 'map' }, async ({ page, url }) => {
  if (!LIVE) await page.route('**/api/map', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    let code = 200, out = null;
    const res = { status(c) { code = c; return this; }, json(b) { out = b; return this; } };
    await handler({ method: 'POST', headers: { authorization: `Bearer ${UID}` }, body }, res);
    await route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(out) });
  });

  /* Reachable from the Ledger, and never pushed. The record is real so the
     Ledger has something to show; the map itself is served by the handler
     above, because a freed figure and a month of days take a month. */
  const seeded = LIVE
    ? await seedTwoCycles(page, url, {
        supa: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        closed: ['done', 'miss', 'silent', 'done', 'done'],
        open: ['miss', 'done', 'open'],
      })
    : await seedRecord(page, url, {
        supa: env.VITE_SUPABASE_URL, anon: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        days: ['done', 'miss', 'open'],
      });
  check('a real record, written by the account itself', !seeded.error, seeded.error ?? seeded.made);

  await page.goto(`${url}/ledger`, { waitUntil: 'networkidle' });
  await page.locator('[data-trial], [data-mirror], text=/what actually happened/i').first()
    .waitFor({ timeout: 30000 }).catch(() => {});

  const way = page.getByRole('link', { name: /^the map$/i });
  const hasWay = await way.count() === 1;
  check('the Ledger carries a way to it', hasWay);
  if (!hasWay) throw new Error('no way to the map from the Ledger; nothing below can be checked');

  /* Never pushed: no badge, no count, no "you have unseen positions". The link
     is four words and says nothing about what is behind it. */
  const wayText = (await way.innerText()).replace(/\s+/g, ' ').trim();
  check('and says nothing about what is there', wayText.toLowerCase() === 'the map', JSON.stringify(wayText));
  const pushed = /\b(new|unseen|unlocked|badge|\d+\s*(new|waiting))\b/i
    .test(await page.locator('body').innerText());
  check('nothing on the Ledger advertises it', !pushed);

  await way.click();
  await page.waitForURL(/\/map$/, { timeout: 15000 });
  check('and it goes there', new URL(page.url()).pathname === '/map');
  await page.locator('[data-map="figures"]').waitFor({ timeout: 30000 });
  await page.waitForTimeout(700);

  // ── The figures ──────────────────────────────────────────────────────────
  const positions = await page.locator('[data-position]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-position')));
  check('twenty-five positions', positions.length === 25, `${positions.length}`);
  if (LIVE) {
    /* Nothing has been freed on a two-day-old account, and that is the honest
       state to check against a deployment: every position a lock, saying
       nothing. */
    check('nothing freed yet, so every position is a lock',
      positions.every((p) => p === 'locked'), `${positions.filter((p) => p === 'locked').length}/25 locked`);
  } else {
    check('one freed, rendered in full', positions.filter((p) => p === 'freed').length === 1);
    check('one active, dimmed in place', positions.filter((p) => p === 'active').length === 1);
    check('and everything else is a lock', positions.filter((p) => p === 'locked').length === 23,
      `${positions.filter((p) => p === 'locked').length} locked`);
  }

  if (!LIVE) {
    const freedText = (await page.locator('[data-position="freed"]').innerText()).replace(/\s+/g, ' ').trim();
    check('the freed figure is named and dated', /The Devil/i.test(freedText) && /\d{4}/.test(freedText), freedText);

    const activeOpacity = await page.locator('[data-position="active"] [data-card]').evaluate(
      (el) => Number(getComputedStyle(el).opacity));
    check('the active trial is dimmed, not hidden', activeOpacity > 0.1 && activeOpacity < 0.6,
      `opacity ${activeOpacity}`);
  }

  /* A locked position must give nothing away — not a name, not a hint that a
     name exists. Somebody who has never met the Devil should not learn here
     that there is one. */
  const lockText = (await page.locator('[data-position="locked"]').allInnerTexts()).join('').trim();
  check('a lock says nothing at all', lockText === '', JSON.stringify(lockText.slice(0, 40)));
  const rejectedShown = /the sun/i.test(await page.locator('body').innerText());
  check('a rejected figure is not on the map', !rejectedShown);

  // ── The days ─────────────────────────────────────────────────────────────
  const days = await page.locator('[data-day]').evaluateAll((els) =>
    els.map((el) => {
      const cs = getComputedStyle(el);
      return { state: el.getAttribute('data-day'), bg: cs.backgroundColor, border: cs.borderTopColor };
    }));
  check('one square per day since the first cycle opened',
    LIVE ? days.length >= 8 : days.length === SHAPE.length + 1,
    `${days.length} squares`);
  check('filled where they crossed it',
    days.filter((d) => d.state === 'done').every((d) => !/rgba\(0, 0, 0, 0\)/.test(d.bg)));
  check('outlined where they committed and did not',
    days.filter((d) => d.state === 'missed').every((d) => /rgba\(0, 0, 0, 0\)/.test(d.bg)));
  check('and gaps are just empty', days.some((d) => d.state === 'empty'),
    `${days.filter((d) => d.state === 'empty').length} empty`);
  check('every square is one of the three states',
    days.every((d) => ['done', 'missed', 'empty'].includes(d.state)));

  /* One ink. A missed day is drawn with the same pen as a crossed one. */
  const hues = new Set(days.flatMap((d) => [d.bg, d.border])
    .filter((c) => !/rgba\(0, 0, 0, 0\)/.test(c))
    .map((c) => {
      const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number);
      return Math.max(r, g, b) - Math.min(r, g, b) > 12 ? 'coloured' : 'neutral';
    }));
  check('no colour anywhere in the grid', !hues.has('coloured'), [...hues].join(', '));

  // ── The cycles ───────────────────────────────────────────────────────────
  const cycles = await page.locator('[data-cycle]').evaluateAll((els) =>
    els.map((el) => ({ how: el.getAttribute('data-cycle'), text: (el.textContent ?? '').replace(/\s+/g, ' ').trim() })));
  check('only closed cycles are listed', cycles.length === (LIVE ? 1 : 2), `${cycles.length}`);
  check('each carries the target as they named it',
    cycles.every((c) => c.text.length > 40), cycles.map((c) => c.how).join(', '));
  check('and how it closed, and when',
    LIVE ? cycles.every((c) => /\d{4}/.test(c.text) && c.how.length > 2)
         : cycles.some((c) => /crossed/.test(c.how)) && cycles.some((c) => /expired/.test(c.how)),
    cycles.map((c) => c.how).join(', '));

  // ── Nothing to optimise against ──────────────────────────────────────────
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  check('no percentage', !/%/.test(body));
  check('no "n of m"', !/\b\d+\s*(of|\/)\s*\d+\b/i.test(body), (body.match(/\b\d+\s*(of|\/)\s*\d+\b/i) ?? [''])[0]);
  check('no count of the figures', !/\b(25|twenty-five|positions?|unlocked|remaining|complete)\b/i.test(body),
    (body.match(/\b(25|twenty-five|positions?|unlocked|remaining|complete)\b/i) ?? [''])[0]);
  check('no progress bar', await page.locator('progress, [role="progressbar"]').count() === 0);

  if (SHOTS) {
    await mkdir(SHOTS, { recursive: true });
    await page.screenshot({ path: `${SHOTS}/map.png`, fullPage: true });
  }
});

await store.close();
console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
