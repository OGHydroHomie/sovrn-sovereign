/**
 * What the twelve-hour field actually stores.
 *
 * The field takes 1-12 with an AM/PM toggle and the chart still wants "15:04",
 * so the only question that matters is what leaves the browser. Nothing
 * persists the answers locally, so this reads the request the quiz itself
 * sends: /api/generate is intercepted, the posted body is captured, and the
 * generation is refused so no model call is made and no account is charged for
 * a test about a text field.
 *
 * Midnight and noon are the two every implementation of this gets wrong —
 * 12 AM is hour zero and 12 PM is hour twelve — so both are here, in both
 * directions, alongside the case where somebody types 18 out of habit.
 *
 *   node scripts/probe-birthtime.mjs
 */
import { mkdir } from 'node:fs/promises';
import { probe } from './lib/probe.mjs';

const URL_ = process.env.SOVRN_URL ?? 'http://localhost:5173';
const EMAIL = process.env.SOVRN_TEST_EMAIL ?? 'elijahpitts@gmail.com';
const SHOTS = process.env.SHOTS ?? null;
let shot = false;

let n = 0, bad = 0;
const is = (label, got, want) => {
  n++; const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(46)} ${JSON.stringify(got)}${ok ? '' : `  expected ${JSON.stringify(want)}`}`);
};

/* hour typed, minute typed, meridiem tapped (null = leave it to the field) */
const CASES = [
  { name: 'midnight',            hour: '12', minute: '00', tap: 'am', want: '00:00' },
  { name: 'noon',                hour: '12', minute: '00', tap: 'pm', want: '12:00' },
  { name: 'five past nine, am',  hour: '9',  minute: '05', tap: 'am', want: '09:05' },
  { name: 'five past nine, pm',  hour: '9',  minute: '05', tap: 'pm', want: '21:05' },
  { name: 'typed 18 out of habit', hour: '18', minute: '45', tap: null, want: '18:45' },
  { name: 'typed 00 out of habit', hour: '00', minute: '30', tap: null, want: '00:30' },
];

await probe({ url: URL_, name: 'birthtime' }, async ({ page, url }) => {
  let posted = null;
  await page.route('**/api/generate', async (route) => {
    try { posted = JSON.parse(route.request().postData() ?? '{}'); } catch { posted = null; }
    /* Refused, so the quiz keeps its answers and nothing is generated. */
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"probe"}' });
  });

  const heading = async () =>
    (await page.locator('h2').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

  const walk = async (c) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('h1').first().click();
    await page.waitForTimeout(2300);
    await page.getByRole('button', { name: /i create my fate/i }).click();

    const answers = ['Checkbot', '1990-04-05', null, 'Detroit, United States',
      'That I am not as good as people think and that they will find out.',
      'To finish the record and tour it in small rooms.',
      'I get to ninety percent and then I start over.',
      EMAIL.replace('@', `+bt${Date.now()}@`)];

    for (let step = 0; step < answers.length; step++) {
      const before = await heading();
      if (step === 1) {
        await page.locator('#dob-day').fill('5');
        await page.locator('#dob-month').fill('4');
        await page.locator('#dob-year').fill('1990');
      } else if (step === 2) {
        await page.locator('#tob-hour').fill(c.hour);
        await page.locator('#tob-minute').fill(c.minute);

        /* Before the toggle is answered the question is not answered. */
        if (c.tap) {
          const next = page.getByRole('button', { name: /continue|next/i }).first();
          is(`${c.name}: Next is shut until AM or PM is chosen`,
            await next.isDisabled().catch(() => null), true);
          await page.locator(`#tob-${c.tap}`).click();
          /* Wait for the state to be painted, not merely dispatched, and not
             merely committed either. The attribute flips a frame after the
             click and the colour takes a 150ms transition to arrive after that
             — measuring in between read rgba(212,212,209,0.698) on a
             half-applied background and called a 19:1 control 5:1. Settles when
             two consecutive frames agree on the colour. */
          await page.locator(`#tob-${c.tap}[aria-pressed="true"]`).waitFor({ timeout: 5000 });
          /* Two consecutive animation frames agreeing is not enough — an ease
             spends long enough near its ends that two reads round to the same
             string while the colour is still a third of the way there. The
             transition announces its own end; this waits for that, with a
             bounded fallback in case it fired before the listener attached. */
          await page.evaluate((id) => new Promise((done) => {
            const el = document.getElementById(id);
            const finish = () => done(null);
            el.addEventListener('transitionend', finish, { once: true });
            setTimeout(finish, 600);
          }), `tob-${c.tap}`);
        }

        /* What the field settled on, after any twenty-four-hour entry was
           folded back into twelve. */
        const shown = {
          hour: await page.locator('#tob-hour').inputValue(),
          am: await page.locator('#tob-am').getAttribute('aria-pressed'),
          pm: await page.locator('#tob-pm').getAttribute('aria-pressed'),
        };
        const lit = shown.am === 'true' ? 'AM' : shown.pm === 'true' ? 'PM' : 'neither';

        /* Once, on the first case: what it looks like, and whether every part
           of it can be read against what is actually painted behind it. The
           intake is dark and the contrast pass on it set the floor at 4.5:1. */
        if (SHOTS && !shot) {
          shot = true;
          await mkdir(SHOTS, { recursive: true });
          await page.screenshot({ path: `${SHOTS}/birthtime.png` });
          const contrast = await page.evaluate(() => {
            const lum = (c) => {
              const p = c.match(/[\d.]+/g).map(Number);
              const a = p.length > 3 ? p[3] : 1;
              const [r, g, b] = p.slice(0, 3).map((v) => v * a + 12 * (1 - a))
                .map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
              return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            /* The ground under a control, read off the field itself.
               The dark intake is not a background colour — DESIGN_FROZEN keeps
               the ground as paper and the darkness is the dithered canvas drawn
               over it — so asking an element what is painted behind it walks up
               to the body and finds cream, and every reading comes back 1.00:1
               against near-white type. The pixels are the only honest source. */
            const field = document.querySelector('canvas');
            const fx = field && field.getContext('2d', { willReadFrequently: true });
            const fr = field && field.getBoundingClientRect();
            const behind = (el) => {
              const cs = getComputedStyle(el);
              if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) {
                return cs.backgroundColor;
              }
              if (!fx || !fr) return 'rgb(12,12,11)';
              const r = el.getBoundingClientRect();
              const sx = Math.round((r.left - fr.left) / fr.width * field.width);
              const sy = Math.round((r.top - fr.top) / fr.height * field.height);
              const sw = Math.max(1, Math.round(r.width / fr.width * field.width));
              const sh = Math.max(1, Math.round(r.height / fr.height * field.height));
              try {
                const d = fx.getImageData(sx, sy, sw, sh).data;
                let sum = 0, count = 0;
                for (let i = 0; i < d.length; i += 4) {
                  /* Alpha-weighted against the near-black ground the field is
                     drawn on, so a cleared region reads as the ground. */
                  const a = d[i + 3] / 255;
                  sum += d[i] * a + 12 * (1 - a);
                  count += 1;
                }
                const v = Math.round(sum / count);
                return `rgb(${v},${v},${v})`;
              } catch { return 'rgb(12,12,11)'; }
            };

            const parts = [
              ...document.querySelectorAll('#tob-hour, #tob-minute, #tob-am, #tob-pm'),
              ...document.querySelectorAll('label[for^="tob-"]'),
            ];
            return parts.map((el) => {
              const cs = getComputedStyle(el);
              const a = lum(cs.color), b = lum(behind(el));
              return {
                what: el.id || el.getAttribute('for') || el.tagName,
                ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                size: parseFloat(cs.fontSize),
                fg: cs.color, bg: behind(el),
              };
            });
          });
          for (const c of contrast) {
            console.log(`      ${c.ratio.toFixed(2)}:1  ${String(c.size)}px  ${c.what.padEnd(11)} ${c.fg} on ${c.bg}`);
          }
          const worst = contrast.reduce((a, b) => (a.ratio < b.ratio ? a : b));
          is('every part of the field clears 4.5:1', worst.ratio >= 4.5, true);
        }
        console.log(`      the field reads ${shown.hour}:${c.minute} ${lit}`);
        is(`${c.name}: exactly one of AM and PM is lit`,
          [shown.am, shown.pm].filter((v) => v === 'true').length, 1);
        is(`${c.name}: the hour shown is 1-12`,
          Number(shown.hour) >= 1 && Number(shown.hour) <= 12, true);
      } else if (step === 3) {
        await page.locator('input:visible, textarea:visible').first().fill(answers[3]);
        await page.waitForTimeout(1200);
        const o = page.locator('[role="option"], li').first();
        if (await o.count()) await o.click().catch(() => {});
      } else {
        const f = page.locator('input:visible, textarea:visible').first();
        await f.waitFor({ state: 'visible', timeout: 20000 });
        await f.fill(answers[step]);
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

    await page.waitForFunction(() => true, null, { timeout: 1000 }).catch(() => {});
    for (let i = 0; i < 40 && !posted; i++) await page.waitForTimeout(250);
  };

  for (const c of CASES) {
    console.log(`\n  ${c.name} — typed ${c.hour}:${c.minute}${c.tap ? `, tapped ${c.tap.toUpperCase()}` : ''}`);
    posted = null;
    await walk(c);
    is(`${c.name}: what leaves the browser`, posted?.birthTime ?? null, c.want);
  }
});

console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
