/**
 * The unbinding, running.
 *
 * A real account walks the real quiz and commits a real act. /api/trial is
 * answered by the real bundled handler against the in-memory PostgREST, because
 * the sequence needs a Devil that arrives on one day and is crossed on the next,
 * and waiting two days for that is not a test.
 *
 * The freed frame does not exist yet — that art is one file per card and it is
 * being drawn. So this synthesises one: the bound frame with the binding region
 * cleared, produced in the page and served to the component through a route.
 * It is a fixture and it is never written to public/. What it proves is the
 * mechanism — that two frames load, that the binding's position is found by
 * measuring where they disagree, that the fall is masked from there downward,
 * and that the pulse runs — none of which depends on the art being good.
 *
 * One divergence worth naming: the Ledger reads the real database and
 * /api/trial reads the fixture, so when this crosses day three it crosses it
 * only in the fixture. The ceremony, which is what is being shown, is driven
 * entirely by the endpoint's answer — but the Ledger underneath still has that
 * day open. This is a demonstration of the unbinding, not of the whole stack.
 *
 *   SHOTS=/tmp/x node scripts/probe-unbinding.mjs
 */
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { probe } from './lib/probe.mjs';
import { seedRecord } from './lib/journey.mjs';
import { fakeDb } from './lib/fake-postgrest.mjs';
import { bundled, SERVERLESS } from './lib/bundle.mjs';

const { default: handler } = await bundled('api/trial.ts', { external: SERVERLESS });

const URL_ = process.env.SOVRN_URL ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS ?? null;
const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n')
  .filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const SUPA = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const UID = '11111111-1111-4111-8111-111111111111';
const CYCLE = 'cycle-one';
const T = (d, h) => new Date(Date.UTC(2026, 8, d, h, 12)).toISOString();

const day = (n, kind) => ({
  id: `entry-${n}`, user_id: UID, day_number: n, cycle_id: CYCLE,
  committed_at: T(n, 5 + n),
  filed_at: kind === 'miss' || kind === 'done' ? T(n, 21) : null,
  completed_at: kind === 'done' ? T(n, 21) : null,
  what_happened: kind === 'miss' ? 'Did not get to it.' : null,
  mission_text: 'Send the offer to the next named person.',
  trial_id: null, trial_encounter: null,
});

const store = fakeDb({
  ledger_entries: [day(1, 'miss'), day(2, 'miss'), day(3, 'open')],
  cycles: [{ id: CYCLE, user_id: UID, rubric: 'Crossed when the offer has been sent to three named people.',
             closed_at: null, opened_at: T(1, 0), crossed_at: null, requires_contact: null }],
  users: [{ id: UID, timezone: 'Europe/London' }],
  trials: [],
}, { trials: ['user_id','cycle_id','figure','state','encounter','reason','quest','last_day','freed_at','freed_by_entry','freed_seen_at'] },
   /* The two indexes the product actually relies on, in production:
      one active trial per person, and one shot per figure per cycle. */
   { trials: [
       { on: ['user_id'], where: (r) => r.state === 'active' },
       { on: ['user_id', 'cycle_id', 'figure'] },
     ] });

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

await store.listen().then((url) => {
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = 'service-role-fixture';
  delete process.env.ANTHROPIC_API_KEY;
});

await probe({ url: URL_, name: 'unbinding' }, async ({ page, url }) => {
  /* The beats, sampled every frame. The fall is 1.2s and the pulse 0.8s, and
     500ms of film cannot resolve either — the first filmstrip of this showed a
     bound card, then a destroyed one, then an unbound one, and the fall itself
     appeared nowhere in it. */
  await page.addInitScript(() => {
    /* Archived, not latched. The live slot is cleared when the screen unmounts,
       and the film runs longer than the screen does — reading it afterwards
       found an empty object and reported a sequence that had just run as never
       having happened. The arrival's sampler learned this first. */
    window.__unbinds = [];
    window.__unbind = { t0: null, beats: {}, ink: [] };
    const seen = (k, t) => { if (window.__unbind.beats[k] === undefined) window.__unbind.beats[k] = t; };
    const shown = (el, stop) => {
      let o = 1, node = el;
      while (node && node !== stop.parentElement) { o *= Number(getComputedStyle(node).opacity); node = node.parentElement; }
      return o;
    };
    const tick = () => {
      const root = document.querySelector('[data-unbinding-screen]');
      if (root) {
        if (window.__unbind.t0 === null) {
          window.__unbind = { t0: performance.now(), beats: {}, ink: [] };
          window.__unbinds.push(window.__unbind);
        }
        const t = Math.round(performance.now() - window.__unbind.t0);
        for (const el of root.querySelectorAll('[data-unbound]')) {
          if (shown(el, root) > 0.5) seen(el.getAttribute('data-unbound'), t);
        }
        const c = root.querySelector('canvas[data-unbinding]');
        if (c) {
          try {
            const d = c.getContext('2d', { willReadFrequently: true })
              .getImageData(0, 0, c.width, c.height).data;
            /* Two numbers: how much ink there is below the halfway line (the
               binding leaving shows up here), and total ink (the breath). */
            let low = 0, all = 0;
            const half = Math.floor(c.height / 2) * c.width * 4;
            for (let i = 3; i < d.length; i += 4 * 7) {
              all += d[i];
              if (i > half) low += d[i];
            }
            window.__unbind.ink.push({ t, low, all, phase: c.dataset.phase ?? '?' });
          } catch { /* not ours */ }
        }
        const o = Number(getComputedStyle(root).opacity);
        if (o >= 0.99) window.__unbind.wasOpaque = true;
        if (window.__unbind.wasOpaque && o < 0.98) seen('handover', t);
      } else if (window.__unbind.t0 !== null) {
        seen('gone', Math.round(performance.now() - window.__unbind.t0));
        /* Clear the live slot only. The archive is the whole point, and the
           first version of this reset cleared that too — emptying the list one
           line after pushing the record into it. */
        window.__unbind = { t0: null, beats: {}, ink: [] };
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.route('**/api/trial', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    let code = 200, out = null;
    const res = { status(c) { code = c; return this; }, json(b) { out = b; return this; } };
    await handler({ method: 'POST', headers: { authorization: `Bearer ${UID}` }, body }, res);
    if (process.env.TRACE) {
      console.log(`      [api/trial ${body.action ?? 'state'}] -> ${JSON.stringify(out).slice(0, 130)}`);
    }
    await route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(out) });
  });

  /* The stand-in freed frame, drawn from the real one. Everything below the
     shoulders that is not the figure's own column is cleared, which is a crude
     approximation of a chain leaving and an exact exercise of the machinery
     that has to notice it. */
  let fixtureMade = false;
  await page.route('**/marks/the-devil-freed.png', async (route) => {
    const dataUrl = await page.evaluate(async () => {
      const img = await new Promise((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/marks/the-devil.png';
      });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      /* Clear the outer thirds below 38% — where the hanging chain is — and
         leave the central figure untouched. */
      const y0 = Math.round(c.height * 0.38);
      x.clearRect(0, y0, Math.round(c.width * 0.33), c.height - y0);
      x.clearRect(Math.round(c.width * 0.67), y0, Math.round(c.width * 0.33), c.height - y0);
      return c.toDataURL('image/png');
    });
    fixtureMade = true;
    await route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(dataUrl.split(',')[1], 'base64'),
    });
  });

  /* Seeded rather than walked. The unbinding has no model call anywhere in it
     and the quiz has three — and those three are where every transient failure
     in this session has actually landed. Putting them in front of a ceremony
     that does not depend on them buys nothing but flakiness. */
  const seeded = await seedRecord(page, url, { supa: SUPA, anon: ANON });
  check('a real cycle and a real act, written by the account', !seeded.error, seeded.error ?? seeded.made);

  const shot = async (dir, seconds) => {
    if (!SHOTS) return;
    await mkdir(`${SHOTS}/${dir}`, { recursive: true });
    const t0 = Date.now();
    for (let i = 0; i < seconds * 2; i++) {
      const wait = t0 + i * 500 - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);
      await page.screenshot({ path: `${SHOTS}/${dir}/${String(Date.now() - t0).padStart(5, '0')}ms.png` });
    }
  };

  /* Day three: the Devil arrives. Watched through, because the unbinding must
     follow an arrival rather than replace one. */
  await page.goto(`${url}/ledger`, { waitUntil: 'networkidle' });
  await page.locator('[data-trial]').first().waitFor({ timeout: 30000 }).catch(() => {});
  await page.locator('[data-trial-arrival]').first().waitFor({ state: 'detached', timeout: 25000 }).catch(() => {});
  check('the Devil arrives first', await page.locator('[data-trial]').count() === 1);

  /* They cross it. */
  const row = store.db.ledger_entries.find((e) => e.day_number === 3);
  Object.assign(row, {
    filed_at: T(3, 21), completed_at: T(3, 21),
    what_happened: 'Sent it without reading it again.',
  });
  store.db.ledger_entries.push(day(4, 'open'));

  if (process.env.TRACE) {
    console.log(`      [db] trials: ${JSON.stringify(store.db.trials.map((t) => [t.figure, t.state, t.encounter, t.last_day]))}`);
    console.log(`      [db] days:   ${JSON.stringify(store.db.ledger_entries.map((e) => [e.day_number, e.filed_at ? 'filed' : '-', e.completed_at ? 'done' : '-']))}`);
  }
  const screen = page.locator('[data-unbinding-screen]');
  await page.goto(`${url}/ledger`, { waitUntil: 'commit' });
  /* Archived before the screen unmounts, because the live slot is cleared the
     moment it does — the same trap the arrival's sampler fell into. */
  await page.addInitScript(() => {});
  await screen.first().waitFor({ timeout: 30000 }).catch(() => {});
  await shot('unbinding', 10);

  await screen.first().waitFor({ state: 'detached', timeout: 25000 }).catch(() => {});

  const m = (await page.evaluate(() => window.__unbinds ?? [])).at(-1) ?? null;
  check('the freed frame was asked for', fixtureMade);
  check('the figure is unbound, once', store.db.trials[0].state === 'freed',
    `state=${store.db.trials[0].state}, seen ${store.db.trials[0].freed_seen_at ? 'stamped' : 'NOT stamped'}`);
  check('and the trial is gone from the Ledger', await page.locator('[data-trial]').count() === 0);

  /* What the card actually did. */
  if (m?.ink?.length) {
    /* From the first frame that has a figure on it. The canvas exists before
       the images decode into it, so the opening samples are an empty card and
       using one as the baseline divides the whole analysis by zero. */
    const ink = m.ink.filter((x) => x.all > 0);
    const rest = ink[0];
    const settledAt = ink.at(-1);
    /* The binding is what lives below the midline and leaves. */
    const fellBy = ink.find((x) => x.low < rest.low * 0.85)?.t ?? null;
    /* The pulse, measured against the figure it happens to — not against the
       one that still had its chain on. The fall removes far more ink than the
       breath adds, so comparing to the opening frame made the peak land on the
       first sample at 1.00x and the assertion pass while measuring nothing. */
    /* The pulse window, as the card itself reports it. */
    const during = ink.filter((x) => x.phase === 'pulse');
    const calm = ink.filter((x) => x.phase === 'settled').at(-1) ?? settledAt;
    /* The furthest the ink gets from where it settles, in either direction.
       Looking only for a rise found nothing: the breath goes down, because
       one-bit ink has no headroom to go up. */
    const peak = during.length
      ? during.reduce((a, b) => (Math.abs(b.all - calm.all) > Math.abs(a.all - calm.all) ? b : a), during[0])
      : calm;

    console.log(`      ink below the midline ${rest.low} → ${settledAt.low}` +
      `   binding gone by ${fellBy}ms   pulse peak ${(peak.all / calm.all).toFixed(3)}x at ${peak.t}ms`);
    console.log(`      line ${m.beats.line}ms   act ${m.beats.act}ms   handover ${m.beats.handover}ms   gone ${m.beats.gone}ms`);

    check('the binding leaves', fellBy !== null && settledAt.low < rest.low * 0.9,
      `${rest.low} → ${settledAt.low}`);
    check('and it is gone well before the line', fellBy !== null && m.beats.line > fellBy + 900,
      `fall done ${fellBy}ms, line ${m.beats.line}ms`);
    /* A breath, not a blink. The first version of this re-thresholded the
       pixels and the figure gained half its ink again for eight hundred
       milliseconds, which read as a glitch. */
    /* It has to be there — this is the only time a card moves — and it has to
       stay a breath. Under 2% and nobody sees it; over 25% and it reads as the
       glitch the first version actually was. */
    const swell = Math.abs(peak.all / calm.all - 1);
    check('the figure breathes once, and only once', swell > 0.02 && swell < 0.25,
      `${(swell * 100).toFixed(1)}% away from the settled figure at its deepest, over ${during.length} frames`);
    check('and every beat happens in its own window',
      new Set(ink.map((x) => x.phase)).size >= 3,
      [...new Set(ink.map((x) => x.phase))].join(' → '));
    check('the line waits, then the act', m.beats.line < m.beats.act && m.beats.act < m.beats.handover);
  } else {
    check('the card was measured', false, 'no samples');
  }

  /* And never again. */
  await page.goto(`${url}/ledger`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check('a reload does not replay it', await screen.count() === 0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-unbinding.png`, fullPage: true });
});

await store.close();
console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
