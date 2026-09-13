/**
 * The trial, wrapping a real day, at 375px.
 *
 * The account is real, the quiz is walked, the act is generated and committed,
 * and the Ledger is the Ledger. The one thing standing in for production is the
 * database behind /api/trial: SUPABASE_SECRET_KEY is not on this machine, so the
 * handler runs here against the in-memory PostgREST instead — real handler, real
 * supabase-js, real queries, fixture rows. What that buys is a history shaped to
 * order, which is the only way to see the second and third encounters without
 * waiting three days for them.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { probe } from './lib/probe.mjs';
import { fakeDb } from './lib/fake-postgrest.mjs';
import { bundled, SERVERLESS } from './lib/bundle.mjs';

const { default: handler } = await bundled('api/trial.ts', { external: SERVERLESS });

const URL_ = process.env.SOVRN_URL ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS ?? null;
const EMAIL = process.env.SOVRN_TEST_EMAIL ?? 'elijahpitts@gmail.com';
const UID = '11111111-1111-4111-8111-111111111111';
const CYCLE = 'cycle-one';
const T = (d, h) => new Date(Date.UTC(2026, 8, d, h, 12)).toISOString();
const day = (n, kind) => ({
  id: `entry-${n}`, user_id: UID, day_number: n, cycle_id: CYCLE,
  committed_at: T(n, 5 + n),
  filed_at: kind === 'miss' || kind === 'done' ? T(n, 21) : null,
  completed_at: kind === 'done' ? T(n, 21) : null,
  trial_id: null, trial_encounter: null,
});

/* Two mornings said yes and neither happened; today is open. */
const store = fakeDb({
  ledger_entries: [day(1, 'miss'), day(2, 'miss'), day(3, 'open')],
  cycles: [{ id: CYCLE, user_id: UID, rubric: 'Crossed when the resignation letter is sent.',
             closed_at: null, opened_at: T(1, 0), crossed_at: null, requires_contact: null }],
  users: [{ id: UID, timezone: 'Europe/London' }],
  trials: [],
}, { trials: ['user_id','cycle_id','figure','state','encounter','reason','quest','last_day','freed_at','freed_by_entry'] });

const file = (n) => Object.assign(store.db.ledger_entries.find((e) => e.day_number === n), { filed_at: T(n, 21) });
const nextDay = () => {
  const last = store.db.ledger_entries.at(-1).day_number;
  file(last);
  store.db.ledger_entries.push(day(last + 1, 'open'));
};

const shot = async (page, tag) => {
  if (!SHOTS) return;
  await mkdir(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${tag}.png`, fullPage: true });
};

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

await probe({ url: URL_, name: 'trials' }, async ({ page, url }) => {
  /* The beats, sampled in the page at every frame.
   *
   * A filmstrip at 500ms cannot tell 4.2s from 5.0s, and this sequence is
   * entirely about when things happen relative to each other. The clock starts
   * when the overlay first exists, which is the moment the spec calls 0.0. */
  await page.addInitScript(() => {
    /* One record per arrival, not one for the session: encounters two and three
       each mount their own overlay, and a sampler that latches the first one
       cannot say anything about the rest. */
    window.__arrivals = [];
    window.__arrival = { t0: null, beats: {} };
    const seen = (k, t) => { if (window.__arrival.beats[k] === undefined) window.__arrival.beats[k] = t; };
    /* What the eye sees, not what the element declares. The act's wrapper is
       the thing held at zero and the paragraph inside it reports opacity 1 all
       the way through — reading that alone said the act arrived at 0ms. */
    const shown = (el, stop) => {
      let o = 1, n = el;
      while (n && n !== stop.parentElement) { o *= Number(getComputedStyle(n).opacity); n = n.parentElement; }
      return o;
    };
    const tick = () => {
      const root = document.querySelector('[data-trial-arrival]');
      if (root) {
        if (window.__arrival.t0 === null) {
          window.__arrival = {
            t0: performance.now(), beats: {},
            mode: root.dataset.ceremony,
            encounter: root.dataset.encounter,
            /* Reduced motion does not paint a field at all. */
            hadField: Boolean(root.querySelector('canvas:not([data-crystallization])')),
          };
          window.__arrivals.push(window.__arrival);
        }
        const t = Math.round(performance.now() - window.__arrival.t0);
        for (const el of root.querySelectorAll('p')) {
          const txt = (el.textContent || '').trim();
          if (shown(el, root) <= 0.5) continue;
          /* The name is uppercased in CSS, so the text in the DOM is not. */
          if (/^the (devil|hermit|sun)$/i.test(txt)) seen('name', t);
          else if (/neither one happened|mornings arrived|acts finished/.test(txt)) seen('reason', t);
          else if (txt.length > 40) seen('act', t);
        }
        /* The card's own canvas. The field is a canvas too, and it is first in
           the document, so an unqualified query measured the starfield and
           reported the ink as complete before the card existed. */
        const c = root.querySelector('canvas[data-crystallization]');
        if (c) {
          try {
            const g = c.getContext('2d', { willReadFrequently: true });
            const d = g.getImageData(0, 0, c.width, c.height).data;
            /* Mean luminance over a sparse sample. Coverage alone is the wrong
               proxy: alpha saturates about a second before the frames stop
               advancing, so "55% covered" called the card finished at 2.1s when
               it was still resolving at 3.6s. What "finished" means here is that
               the picture has stopped changing. */
            let sum = 0, n = 0, on = 0;
            for (let i = 0; i < d.length; i += 4 * 37) {
              n++; sum += (d[i] + d[i + 1] + d[i + 2]) / 3 * (d[i + 3] / 255);
              if (d[i + 3] > 10) on++;
            }
            const mean = sum / n;
            /* The drop lands as a point, so 2% of the card is already several
               frames into the spread — it reported the ink starting at 1415ms
               when the arithmetic downstream put it at 1050. First ink is the
               first ink there is. */
            if (on / n > 0.002) seen('inkStarts', t);
            const prev = window.__arrival.lastMean;
            window.__arrival.lastMean = mean;
            if (prev !== undefined && on / n > 0.5) {
              if (Math.abs(mean - prev) < 0.06) {
                window.__arrival.stillFor = (window.__arrival.stillFor ?? 0) + 1;
                if (window.__arrival.stillFor >= 12) seen('inkFull', t - 200);
              } else window.__arrival.stillFor = 0;
            }
          } catch { /* not ours to read */ }
        }
        if (Number(getComputedStyle(root).opacity) < 0.98) seen('handover', t);
      } else if (window.__arrival.t0 !== null) {
        seen('gone', Math.round(performance.now() - window.__arrival.t0));
        window.__arrival = { t0: null, beats: {} };
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* The endpoint, answered by the endpoint. */
  await page.route('**/api/trial', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    let code = 200, out = null;
    const res = { status(c) { code = c; return this; }, json(b) { out = b; return this; } };
    await handler({ method: 'POST', headers: { authorization: `Bearer ${UID}` }, body }, res);
    await route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(out) });
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('h1').first().click();
  await page.waitForTimeout(2300);
  await page.getByRole('button', { name: /i create my fate/i }).click();

  const answers = ['Checkbot', '1990-04-05', '08:30', 'Detroit, United States',
    'That I am not as good as people think and that they will find out.',
    'To finish the record and tour it in small rooms without apologising for any of it.',
    'I get to ninety percent and then I start over.',
    EMAIL.replace('@', `+tr${Date.now()}@`)];
  const headingNow = async () =>
    (await page.locator('h2').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

  for (let step = 0; step < answers.length; step++) {
    const before = await headingNow();
    if (step === 1) {
      const [y, m, d] = answers[1].split('-');
      await page.locator('#dob-day').fill(String(Number(d)));
      await page.locator('#dob-month').fill(String(Number(m)));
      await page.locator('#dob-year').fill(y);
    } else if (step === 2) {
      const [hh, mm] = answers[2].split(':');
      await page.locator('#tob-hour').fill(hh);
      await page.locator('#tob-minute').fill(mm);
    } else {
      const f = page.locator('input:visible, textarea:visible').first();
      await f.waitFor({ state: 'visible', timeout: 20000 });
      await f.fill(answers[step]);
    }
    if (step === 3) {
      await page.waitForTimeout(1200);
      const option = page.locator('[role="option"], li').first();
      if (await option.count()) await option.click().catch(() => {});
    }
    if (step === 7) {
      const consent = page.locator('#sv-consent');
      if (await consent.count()) await consent.check({ force: true });
    }
    await page.getByRole('button', { name: /continue|reveal|blueprint|next/i }).first().click();
    if (step < answers.length - 1) {
      await page.waitForFunction((was) => {
        const h = document.querySelector('h2');
        const now = (h?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return now !== '' && now !== was;
      }, before, { timeout: 30000, polling: 'raf' });
      await page.waitForTimeout(450);
    }
  }
  console.log('  … generating');
  await page.getByRole('button', { name: /who you are/i }).first().waitFor({ state: 'visible', timeout: 180000 });

  await page.getByText(/what have you been putting off/i).first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('textarea').first().fill('Leave my job and start a business');
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByText(/what does it cost you/i).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('textarea').first().fill(
    'I am forty-one and I keep saying next year. My kids will remember me as someone who talked about it.');
  await page.getByRole('button', { name: /set the target/i }).click();
  const admitted = page.getByRole('button', { name: /that's it/i });
  await admitted.waitFor({ state: 'visible', timeout: 120000 });
  await admitted.click();
  await page.waitForTimeout(2500);

  const oneAct = page.getByRole('button', { name: /one act/i }).first();
  if ((await oneAct.getAttribute('aria-expanded')) !== 'true') await oneAct.click();
  const commit = page.getByRole('button', { name: /the hard one/i }).first();
  await commit.waitFor({ state: 'visible', timeout: 45000 });
  await commit.click();
  await page.waitForFunction(() => /what actually happened/i.test(document.body.innerText),
    null, { timeout: 25000, polling: 500 });
  console.log('  … act committed');

  const card = page.locator('[data-trial]');
  const arrival = page.locator('[data-trial-arrival]');

  /* The ceremony now runs over the Ledger on the first sight of an encounter.
     Film it from the clock started at navigation — every strip in this project
     is cut from the moment the thing was asked for, because guessing when a
     sequence began is how a filmstrip gets mislabelled. */
  const openLedger = async (film = null) => {
    const nav = page.goto(`${url}/ledger`, { waitUntil: 'commit' });
    const t0 = Date.now();
    await nav;
    if (film) {
      await mkdir(`${SHOTS}/${film}`, { recursive: true }).catch(() => {});
      for (let i = 0; i < 18; i++) {
        const want = t0 + i * 500;
        const wait = want - Date.now();
        if (wait > 0) await page.waitForTimeout(wait);
        await page.screenshot({
          path: `${SHOTS}/${film}/${String(Date.now() - t0).padStart(5, '0')}ms.png`,
        });
      }
    }
    /* Wait for the trial to exist before waiting for its ceremony to end.
       `detached` is true of an element that has not mounted yet, so asking for
       it first resolved instantly on every navigation and the assertions then
       read a ceremony that was still running — which is also what left an
       account alive with an overlay sitting on top of /delete. The card and the
       overlay are set from the same state, so the card appearing is the signal
       that there is something to wait out. */
    await card.first().waitFor({ timeout: 20000 }).catch(() => {});
    await arrival.first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
  };

  // ── First encounter ──────────────────────────────────────────────────────
  await openLedger(SHOTS ? 'arrival' : null);

  /* The sequence, measured in the page. Read before anything else is touched. */
  {
    /* The archived record, not the live one. The live slot is cleared the
       moment the overlay unmounts, and openLedger now correctly waits for
       exactly that — so reading it found an empty object and reported a
       sequence that had just run perfectly as never having happened. */
    const a = (await page.evaluate(() => window.__arrivals)).at(-1);
    const b = a?.beats ?? {};
    const order = ['inkStarts', 'inkFull', 'name', 'reason', 'act', 'handover', 'gone'];
    console.log(`      ${order.map((k) => `${k} ${b[k] ?? '—'}ms`).join('   ')}`);

    const T = { inkStarts: 1000, inkFull: 3200, name: 4200, reason: 4800, act: 5600 };
    const late = Object.entries(T)
      .filter(([k]) => b[k] !== undefined)
      .map(([k, want]) => ({ k, want, got: b[k], off: b[k] - want }));
    const worst = late.reduce((x, y) => (Math.abs(x.off) > Math.abs(y.off) ? x : y), late[0]);
    check('every beat lands within 400ms of its mark', worst && Math.abs(worst.off) <= 400,
      worst ? `worst is ${worst.k}: ${worst.got}ms against ${worst.want}ms (${worst.off > 0 ? '+' : ''}${worst.off})` : 'nothing measured');

    /* The hold is the point of the sequence: a finished card, alone, in
       silence. If the name arrives while the ink is still moving there is no
       hold, only an overlap. */
    check('the card finishes, and is alone for a beat', b.inkFull !== undefined && b.name - b.inkFull >= 700,
      `${b.name - b.inkFull}ms of silence between the card resolving and its name`);
    check('one thing at a time, in order',
      b.inkStarts < b.inkFull && b.inkFull < b.name && b.name < b.reason && b.reason < b.act && b.act < b.handover);
  }
  /* The note only reads the element when there is one. Asking a locator that
     matches nothing for an attribute waits thirty seconds and then throws,
     which turns a failing assertion into a dead run with no diagnosis. */
  {
    const n = await card.count();
    const note = n === 1
      ? `data-trial="${await card.getAttribute('data-trial')}" encounter ${await card.getAttribute('data-encounter')}`
      : `${n} cards; page reads: ${JSON.stringify((await page.locator('body').innerText()).replace(/\s+/g, ' '))}`;
    check('a trial is on the Ledger', n === 1, note);
  }

  /* The whole claim of the build: it wraps the day, it does not replace it. */
  /* Anchored on the act's own label rather than on whichever ancestor happens
     to contain the words — the first attempt matched a wrapper at y=0 and
     reported the act as sitting above a trial that is plainly beneath it. */
  const geometry = await page.evaluate(() => {
    const t = document.querySelector('[data-trial]');
    const label = [...document.querySelectorAll('p')]
      .find((el) => /^DAY \d+ · Committed .* · Open$/.test((el.textContent ?? '').trim()));
    const read = [...document.querySelectorAll('p')]
      .find((el) => parseFloat(getComputedStyle(el).fontSize) > 24);
    if (!t || !label) return null;
    return {
      trialTop: t.getBoundingClientRect().top,
      trialBottom: t.getBoundingClientRect().bottom,
      actTop: label.getBoundingClientRect().top,
      readBottom: read ? read.getBoundingClientRect().bottom : null,
    };
  });
  check('the act is still there, underneath it', !!geometry && geometry.actTop >= geometry.trialBottom - 4,
    geometry ? `trial ends at ${Math.round(geometry.trialBottom)}px, act begins at ${Math.round(geometry.actTop)}px` : 'act not found');
  /* Day one has no read — it is written about the day before, and there isn't
     one yet. Where there is one it stays the headline and the trial goes under
     it, so this asserts the order only when there is an order to assert. */
  check('and the read, where there is one, is still the headline above it',
    !!geometry && (geometry.readBottom === null || geometry.readBottom <= geometry.trialTop),
    geometry?.readBottom === null ? 'day one carries no read; nothing to sit under' :
      `read ends at ${Math.round(geometry.readBottom)}px, trial begins at ${Math.round(geometry.trialTop)}px`);

  /* Every colour on the card against what is actually behind it.
     The first version of this card was written in the field's palette and
     rendered as a blank three hundred pixels on the Ledger's paper. innerText
     was full, every text assertion passed, and there was nothing to see. A
     contrast reading is the only assertion that would have caught it. */
  const contrast = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
        .map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    /* What is painted behind an element, not what it declares. */
    const behind = (el) => {
      let node = el;
      while (node && node !== document.documentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg;
        node = node.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    const out = [];
    for (const el of document.querySelector('[data-trial]').querySelectorAll('p, button')) {
      if (!(el.textContent ?? '').trim()) continue;
      const cs = getComputedStyle(el);
      const a = lum(cs.color), b = lum(behind(el));
      out.push({
        text: el.textContent.trim().slice(0, 34),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        size: parseFloat(cs.fontSize),
      });
    }
    return out;
  });
  const worst = contrast.reduce((a, b) => (a.ratio < b.ratio ? a : b));
  for (const c of contrast) console.log(`      ${c.ratio.toFixed(2)}:1  ${c.size}px  ${c.text}`);
  check('every word on the card clears 4.5:1', worst.ratio >= 4.5,
    `worst is ${worst.ratio.toFixed(2)}:1 on "${worst.text}"`);

  const text1 = (await card.innerText()).replace(/\s+/g, ' ');
  /* The name is uppercased in CSS, so innerText comes back shouting. */
  check('it names the figure and says why',
    /the devil/i.test(text1) && /neither one happened/.test(text1), text1.slice(0, 96));
  check('a first encounter is not announced as a return', !/Back a/.test(text1));
  await shot(page, 'trial-1-first');

  // ── Second ───────────────────────────────────────────────────────────────
  nextDay();
  await openLedger(SHOTS ? 'recurrence' : null);
  {
    const a = (await page.evaluate(() => window.__arrivals)).at(-1);
    check('a recurrence arrives without the ceremony', a?.mode === 'recurrence',
      `${a?.mode} at encounter ${a?.encounter}, gone in ${a?.beats?.gone}ms`);
    /* Recognition, not spectacle: one beat and out, against the first
       arrival's eight seconds. */
    check('and it is over in a beat', (a?.beats?.gone ?? 1e9) < 3200, `${a?.beats?.gone}ms`);
  }
  const text2 = (await card.innerText()).replace(/\s+/g, ' ');
  check('a new uncrossed day brings it back', await card.getAttribute('data-encounter') === '2');
  check('and the return is named', /Back a second time, smaller\./.test(text2));
  await shot(page, 'trial-2-second');

  // ── Third, with the motion turned down ───────────────────────────────────
  /* Emulated rather than run in a second context, which would mean a second
     account and a second generation to see one cross-fade. */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  nextDay();
  await openLedger();
  {
    const a = (await page.evaluate(() => window.__arrivals)).at(-1);
    check('reduced motion paints no field', a?.hadField === false, `hadField=${a?.hadField}`);
    check('and crosses the card in under a second', (a?.beats?.gone ?? 1e9) < 2000, `${a?.beats?.gone}ms`);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const text3 = (await card.innerText()).replace(/\s+/g, ' ');
  check('the third encounter', await card.getAttribute('data-encounter') === '3');
  check('ends the returning', /This one ends it\./.test(text3));
  check('and opens a quest', /One act that ends the thing/.test(text3), text3.slice(-92));
  await shot(page, 'trial-3-third');

  // ── this isn't it ────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /this isn.t it/i }).click();
  await page.waitForFunction(() => !document.querySelector('[data-trial]'), null, { timeout: 5000 }).catch(() => {});
  check('saying so removes it at once', await card.count() === 0);
  check('and the act is untouched', /what actually happened|i did it/i.test(await page.locator('body').innerText()));
  await shot(page, 'trial-4-rejected');

  nextDay();
  await openLedger();
  check('and it does not come back', await card.count() === 0,
    `the row reads state="${store.db.trials[0]?.state}"`);
  await shot(page, 'trial-5-gone');
});

await store.close();
console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
