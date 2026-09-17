/**
 * The front page, at 375px.
 *
 * The hero is an idle loop, so it is measured in the page rather than judged
 * from a filmstrip: 500ms of film cannot tell a 2.2s spread from a 3s one, and
 * the thing that would actually be wrong — a stall between figures, or the same
 * figure twice in a row — is invisible in stills.
 *
 *   SHOTS=/tmp/x node scripts/probe-marketing.mjs
 */
import { mkdir } from 'node:fs/promises';
import { probe } from './lib/probe.mjs';

const URL_ = process.env.SOVRN_URL ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS ?? null;

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

await probe({ url: URL_, name: 'marketing' }, async ({ page, url }) => {
  /* Every mark file the page asks for, and when. */
  const fetched = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/\/marks\/.+\.png/.test(u)) fetched.push({ at: Date.now(), url: new URL(u).pathname });
  });
  /* Every frame of the hero's canvas: how much ink is on it, and which figure
     is being drawn. A cycle is a rise, a plateau and a fall; the figure is read
     off the component's key, which changes only when the card does. */
  await page.addInitScript(() => {
    window.__idle = { samples: [], figures: [] };
    const tick = () => {
      const c = document.querySelector('[data-idle] canvas[data-crystallization]');
      if (c) {
        try {
          const d = c.getContext('2d', { willReadFrequently: true })
            .getImageData(0, 0, c.width, c.height).data;
          let on = 0, count = 0;
          for (let i = 3; i < d.length; i += 4 * 31) { count++; if (d[i] > 10) on++; }
          const figure = document.querySelector('[data-idle]')?.dataset.showing ?? '?';
          window.__idle.samples.push({
            t: Math.round(performance.now()), ink: on / count, figure,
            phase: c.dataset.phase ?? '?',
          });
          const last = window.__idle.figures[window.__idle.figures.length - 1];
          if (figure !== '?' && figure !== last) window.__idle.figures.push(figure);
        } catch { /* not ours */ }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const opened = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  /* The thirteen, read off the page rather than restated here — a copy in the
     harness is a second list to keep in step. */
  await page.locator('[data-figure]').first().waitFor({ timeout: 30000 });
  await page.evaluate(() => {
    window.__thirteen = [...document.querySelectorAll('[data-figure]')]
      .map((el) => el.getAttribute('data-figure'));
  });

  // ── Nothing is minted for a stranger ─────────────────────────────────────
  await page.waitForTimeout(2500);
  const minted = await page.evaluate(() => Boolean(localStorage.getItem('sovrn_auth')));
  check('a stranger is not given an account for looking', !minted);

  // ── The hero ─────────────────────────────────────────────────────────────
  await page.locator('[data-idle] canvas[data-crystallization]').waitFor({ timeout: 30000 });
  check('the card is a canvas, drawing', true);

  const heroText = (await page.locator('[data-hero]').innerText()).replace(/\s+/g, ' ').trim();
  /* Everything above the fold, with the one line and the one control removed.
     Whatever is left is what should not be there. */
  const leftover = heroText
    .replace(/You already know the thing you.{1,3}ve been avoiding\./i, '')
    .replace(/find out who you.{1,3}re becoming/i, '')
    .trim();
  check('one line and one control, and nothing else', leftover === '', JSON.stringify(leftover.slice(0, 90)));

  /* Against the actual thirteen, not a pattern. "THE THING YOU'VE BEEN
     AVOIDING" matches /THE [A-Z]+/ and is the copy. */
  const named = await page.evaluate(() => window.__thirteen ?? []);
  check('the figure is never named on the card',
    named.length > 0 && !named.some((nm) => heroText.toUpperCase().includes(nm.toUpperCase())),
    `${named.length} names checked`);

  const call = page.locator('[data-hero] [data-call]');
  check('the control goes to /begin', (await call.getAttribute('href')) === '/begin');

  /* Watch four figures resolve. */
  console.log('  … watching the loop');
  await page.waitForFunction(() => window.__idle.figures.length >= 4, null, { timeout: 45000, polling: 500 });
  const idle = await page.evaluate(() => window.__idle);

  check('it cycles through different figures', idle.figures.length >= 4, idle.figures.join(' → '));
  check('and never the same one twice in a row',
    idle.figures.every((f, i) => i === 0 || f !== idle.figures[i - 1]));

  /* One cycle, measured: ink rises, holds, falls. */
  const byFigure = new Map();
  for (const s of idle.samples) {
    if (!byFigure.has(s.figure)) byFigure.set(s.figure, []);
    byFigure.get(s.figure).push(s);
  }
  /* The second figure seen, so it is a whole cycle rather than the first paint. */
  const run = byFigure.get(idle.figures[1]) ?? [];
  const span = (phase) => {
    const f = run.filter((s) => s.phase === phase);
    return f.length ? f[f.length - 1].t - f[0].t : null;
  };
  const spread = span('spreading');
  const hold = span('holding');
  const gone = span('dissolving');
  console.log(`      spread ${spread}ms   hold ${hold}ms   dissolve ${gone}ms   (${run.length} frames)`);

  check('the ink spreads in about 2.2s', spread !== null && Math.abs(spread - 2200) < 700, `${spread}ms`);
  check('holds for about 1.5s', hold !== null && Math.abs(hold - 1500) < 700, `${hold}ms`);
  check('and dissolves in about 0.8s', gone !== null && Math.abs(gone - 800) < 350, `${gone}ms`);
  check('it never stalls empty between figures',
    idle.samples.filter((s) => s.ink < 0.01).length < idle.samples.length * 0.25,
    `${idle.samples.filter((s) => s.ink < 0.01).length}/${idle.samples.length} frames near-empty`);

  if (SHOTS) {
    await mkdir(SHOTS, { recursive: true });
    await page.screenshot({ path: `${SHOTS}/marketing-hero.png` });
  }

  // ── Below the fold ───────────────────────────────────────────────────────
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  check('the wound is there, unheadered', /Knowing was never the problem/.test(body));
  check('what happens is four plain lines', /Three questions and your birth details/.test(body)
    && /reads what you actually did/.test(body));
  const figures = await page.locator('[data-figure]').count();
  check('all thirteen figures', figures === 13, `${figures}`);
  check('no card is ahead of another', /No card is ahead of another/.test(body));
  /* The thirteen carry their becoming and nothing else. Pairing a loop with a
     becoming here would teach a correspondence that does not exist — they are
     selected independently — and a stranger would carry it into their reading.
     (The word "loop" appears once in the copy above, describing what the
     product does. That is not a pairing.) */
  const captions = await page.locator('[data-figure]').allInnerTexts();
  check('the thirteen carry a becoming and nothing else',
    captions.length === 13 && captions.every((c) => named.includes(c.replace(/\s+/g, ' ').trim())),
    captions.map((c) => c.trim()).slice(0, 2).join(' | '));

  const slot = page.locator('[data-video]');
  check('the video slot holds its shape while empty', await slot.getAttribute('data-video') === 'empty');
  const ratio = await slot.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.width / r.height;
  });
  check('and it is 16:9', Math.abs(ratio - 16 / 9) < 0.05, ratio.toFixed(3));

  /* The numbers are the wall's own, asked of the wall — so the assertion is
     the contract between them rather than an assumption about either. Locally
     /api proxies to the deployment, which does not have the JSON mode until
     this ships; a check that demanded numbers before then would fail on a page
     that is working exactly as designed. */
  const counter = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/wall?format=json', { headers: { Accept: 'application/json' } });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  });
  const count = (await page.locator('[data-count]').innerText()).replace(/\s+/g, ' ').trim();
  if (counter?.people) {
    check('the counter shows the wall\'s own numbers',
      count.includes(counter.people) && count.includes(counter.did_line),
      JSON.stringify(count));
  } else {
    check('with no numbers to show, it claims none',
      !/\d/.test(count) && /committed to today/i.test(count), JSON.stringify(count));
  }
  check('and nothing is invented either way',
    !/\b(join|thousands|everyone|people are|so far)\b/i.test(count));

  check('the record points at the wall',
    (await page.getByRole('link', { name: /see the wall/i }).getAttribute('href')) === '/wall');

  const calls = await page.locator('[data-call]').count();
  check('the same control closes the page', calls === 2, `${calls}`);

  // ── Constraints ──────────────────────────────────────────────────────────
  check('no pricing, testimonials or borrowed credibility',
    !/\$|£|per month|pricing|testimonial|as seen in|trusted by|reviews?\b/i.test(body),
    (body.match(/\$|£|pricing|testimonial|as seen in|trusted by/i) ?? [''])[0]);

  /* Paper appears exactly once in this product, at the reveal. Not here. */
  const luma = await page.evaluate(async () => {
    const shot = document.documentElement;
    void shot;
    /* Mean luminance of what is actually painted, sampled off the field. */
    const c = document.querySelector('canvas');
    if (!c) return null;
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    let sum = 0, count = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { sum += d[i] * (d[i + 3] / 255); count++; }
    return sum / count;
  });
  check('the ground is dark', luma !== null && luma < 40, `mean ink ${luma?.toFixed(1)}`);

  /* What the first screen cost. Only the card in front of them and the one
     queued behind it; the thirteen below the fold wait until they are near. */
  /* Within the first few seconds — the loop runs for the length of this probe
     and fetches a fresh set every four and a half, so counting the whole run
     counts the idle rather than the arrival. */
  const early = fetched.filter((f) => f.at - opened < 4000);
  const frames = early.filter((f) => /-x\d\.png$/.test(f.url));
  const finished = fetched.filter((f) => !/-x\d\.png$/.test(f.url));
  check('the first screen fetches two cards\' frames, not thirteen',
    frames.length <= 18, `${frames.length} frame files in the first 4s`);
  check('and the thirteen below the fold have not been fetched',
    finished.length <= 2, `${finished.length} finished marks before scrolling`);

  if (SHOTS) await page.screenshot({ path: `${SHOTS}/marketing.png`, fullPage: true });

  /* And they arrive once the grid is in reach. */
  await page.locator('[data-thirteen]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  check('and they arrive when the grid does',
    fetched.filter((f) => !/-x\d\.png$/.test(f.url)).length >= 10,
    `${fetched.filter((f) => !/-x\d\.png$/.test(f.url)).length} after scrolling`);

  // ── The routes ───────────────────────────────────────────────────────────
  // ── Reduced motion ───────────────────────────────────────────────────────
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  check('reduced motion gets one static card',
    await page.locator('[data-idle="static"]').count() === 1);
  check('and nothing is looping', await page.locator('[data-idle] canvas[data-crystallization]').count() === 0);
  check('the card is still there', await page.locator('[data-idle] img, [data-idle] div').count() > 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.goto(`${url}/begin`, { waitUntil: 'networkidle' });
  const begun = await page.locator('body').innerText();
  check('/begin is the door', /ascend|i create my fate|sovrn/i.test(begun) && !/You already know the thing/.test(begun));

  await page.goto(`${url}/nonsense-path`, { waitUntil: 'networkidle' });
  check('an unknown path lands on the front page',
    /You already know the thing/.test(await page.locator('body').innerText()));
});

console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
