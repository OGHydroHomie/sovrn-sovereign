/**
 * The arrival, on production, without the generator in the path.
 *
 * The full live check walks the quiz, which means two model calls that have
 * twice been slow rather than broken — and the ceremony does not depend on
 * either. This makes a real account on the real site, writes a cycle and three
 * real days through PostgREST with that account's own JWT under RLS, and then
 * opens the deployed Ledger and films what the deployed bundle does.
 *
 *   node scripts/verify-arrival-live.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import { probe } from './lib/probe.mjs';

const URL_ = process.env.SOVRN_URL ?? 'https://www.sovrn.online';
const SHOTS = process.env.SHOTS ?? null;

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n')
  .filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const SUPA = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

await probe({ url: URL_, name: 'arrival' }, async ({ page, url }) => {
  /* The same sampler the local probe uses, so the beats are measured the same
     way on the deployment as they are on the dev server. */
  await page.addInitScript(() => {
    window.__arrivals = [];
    window.__arrival = { t0: null, beats: {} };
    const seen = (k, t) => { if (window.__arrival.beats[k] === undefined) window.__arrival.beats[k] = t; };
    const shown = (el, stop) => {
      let o = 1, node = el;
      while (node && node !== stop.parentElement) { o *= Number(getComputedStyle(node).opacity); node = node.parentElement; }
      return o;
    };
    const tick = () => {
      const root = document.querySelector('[data-trial-arrival]');
      if (root) {
        if (window.__arrival.t0 === null) {
          window.__arrival = { t0: performance.now(), beats: {}, mode: root.dataset.ceremony };
          window.__arrivals.push(window.__arrival);
        }
        const t = Math.round(performance.now() - window.__arrival.t0);
        /* Keyed off the elements' own labels, not off what they say. */
        for (const el of root.querySelectorAll('[data-arrival]')) {
          if (shown(el, root) > 0.5) seen(el.getAttribute('data-arrival'), t);
        }
        const c = root.querySelector('canvas[data-crystallization]');
        if (c) {
          try {
            const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
            let sum = 0, cnt = 0, on = 0;
            for (let i = 0; i < d.length; i += 4 * 37) {
              cnt++; sum += (d[i] + d[i + 1] + d[i + 2]) / 3 * (d[i + 3] / 255);
              if (d[i + 3] > 10) on++;
            }
            const mean = sum / cnt;
            if (on / cnt > 0.002) seen('inkStarts', t);
            const prev = window.__arrival.lastMean;
            window.__arrival.lastMean = mean;
            if (prev !== undefined && on / cnt > 0.5) {
              if (Math.abs(mean - prev) < 0.06) {
                window.__arrival.stillFor = (window.__arrival.stillFor ?? 0) + 1;
                if (window.__arrival.stillFor >= 12) seen('inkFull', t - 200);
              } else window.__arrival.stillFor = 0;
            }
          } catch { /* not ours */ }
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

  await page.goto(url, { waitUntil: 'networkidle' });

  /* A record, written by the account itself. Two mornings said yes and neither
     happened; today is open. Every row is a real row in the real database. */
  const seeded = await page.evaluate(async ({ supa, anon }) => {
    const auth = JSON.parse(localStorage.getItem('sovrn_auth'));
    const token = auth.access_token, uid = auth.user.id;
    const post = async (path, body) => {
      const res = await fetch(`${supa}/rest/v1/${path}`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: `Bearer ${token}`,
                   'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    };
    await fetch(`${supa}/rest/v1/users?id=eq.${uid}`, {
      method: 'PATCH',
      headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: 'Europe/London' }),
    });

    const cyc = await post('cycles', {
      user_id: uid, cycle_number: 1,
      /* Both the stated and the admitted target: the table requires each, and
         the difference between them is the narrowing the product does. */
      target_stated: 'Leave my job and start a business',
      target_admitted: 'Write a one-page paid offer and send it to three people who could hire you.',
      rubric: 'Crossed when the one-page offer, with a price on it, has been sent to three named people.',
      cost: 'I keep saying next year.',
      closes_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    });
    if (cyc.status >= 300) return { error: `cycles ${cyc.status} ${JSON.stringify(cyc.body).slice(0, 160)}` };
    const cycleId = cyc.body[0].id;

    const days = [
      { d: 1, kind: 'miss', text: 'Write the one-page offer.' },
      { d: 2, kind: 'miss', text: 'Send it to the first person.' },
      { d: 3, kind: 'open', text: 'Send it to the second person.' },
    ];
    const made = [];
    for (const { d, kind, text } of days) {
      const at = new Date(Date.now() - (4 - d) * 864e5 + d * 36e5).toISOString();
      const r = await post('ledger_entries', {
        user_id: uid, cycle_id: cycleId, day_number: d, mission_text: text,
        committed_at: at,
        filed_at: kind === 'miss' ? at : null,
        what_happened: kind === 'miss' ? 'Did not get to it.' : null,
      });
      made.push(`${kind}:${r.status}`);
      if (r.status >= 300) return { error: `ledger_entries ${r.status} ${JSON.stringify(r.body).slice(0, 160)}` };
    }
    return { uid, cycleId, made };
  }, { supa: SUPA, anon: ANON });

  check('a real record, written by the account itself', !seeded.error, seeded.error ?? seeded.made.join(' '));
  if (seeded.error) return;

  await page.goto(`${url}/ledger`, { waitUntil: 'commit' });
  if (SHOTS) {
    await mkdir(`${SHOTS}/live-arrival`, { recursive: true });
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) {
      const wait = t0 + i * 500 - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);
      await page.screenshot({ path: `${SHOTS}/live-arrival/${String(Date.now() - t0).padStart(5, '0')}ms.png` });
    }
  }
  await page.locator('[data-trial]').first().waitFor({ timeout: 40000 }).catch(() => {});
  await page.locator('[data-trial-arrival]').first().waitFor({ state: 'detached', timeout: 25000 }).catch(() => {});

  const a = (await page.evaluate(() => window.__arrivals)).at(-1);
  const b = a?.beats ?? {};
  console.log(`      ${['inkStarts','inkFull','name','reason','act','handover','gone'].map((k) => `${k} ${b[k] ?? '—'}ms`).join('   ')}`);

  check('the deployed bundle runs the full ceremony', a?.mode === 'full', `mode=${a?.mode}`);
  check('the card crystallizes, then holds alone', b.inkFull !== undefined && b.name - b.inkFull >= 700,
    `${b.name - b.inkFull}ms of silence`);
  check('one thing at a time, in order',
    b.inkStarts < b.inkFull && b.inkFull < b.name && b.name < b.reason && b.reason < b.act && b.act < b.handover);

  const after = await page.evaluate(() => {
    const c = document.querySelector('[data-trial]');
    return { card: Boolean(c), figure: c?.dataset.trial ?? null, act: /what actually happened/i.test(document.body.innerText) };
  });
  check('and hands over to the Ledger with the card on it', after.card && after.figure === 'devil', `data-trial="${after.figure}"`);
  check('with the act underneath, untouched', after.act);

  /* A reload is not a second arrival. */
  await page.goto(`${url}/ledger`, { waitUntil: 'networkidle' });
  await page.locator('[data-trial]').first().waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const replay = await page.evaluate(() => Boolean(document.querySelector('[data-trial-arrival]')));
  check('a reload does not replay it', !replay);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/live-ledger.png`, fullPage: true });
});

console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
