import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

/* One real generation on production, instrumented.
 *
 * The dev preview could show the sequence but not the thing it was built
 * around: twenty seconds of waiting handing over to frame one. That hand-over
 * only exists at the end of a real generation, so this runs one — through the
 * hero, the threshold, the eight questions — and samples every animation frame
 * from the moment the answers are in until the reveal has settled.
 *
 * "No seam" is measured, not judged: across the hand-over there must be no
 * rendered frame in which neither the loading square nor the card is on screen.
 * A gap of even one frame is a flash of empty paper.
 */
const URL_ = process.argv[2] ?? 'https://www.sovrn.online';
const OUT = process.argv[3];
const EMAIL = process.argv[4];
if (!OUT || !EMAIL || !/@/.test(EMAIL)) {
  console.error('usage: node .prod-reveal.mjs <url> <outdir> <real-email>');
  process.exit(2);
}
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

await page.addInitScript(() => {
  window.__run = { on: false, t0: 0, cardAt: null, samples: [], events: [] };

  const eff = (el) => { let o = 1; while (el && el !== document.body) { o *= Number(getComputedStyle(el).opacity); el = el.parentElement; } return o; };
  const area = (el) => { const r = el.getBoundingClientRect(); return Math.max(0, r.width) * Math.max(0, r.height); };

  /* The two black objects, each found by what it is rather than by a hook: the
     loading square is the only 2px black-bordered box in the product, and the
     card is the only element ever showing frame one. */
  const findSquare = () => [...document.querySelectorAll('div')].find((d) => {
    const s = getComputedStyle(d);
    return s.borderTopWidth === '2px' && s.borderTopColor === 'rgb(0, 0, 0)';
  });
  const findCard = () => document.querySelector('img[src*="-x1.png"]');
  const findMark = () => document.querySelector('img[src*="/marks/"]');

  window.__startRun = () => {
    if (window.__run.on) return;
    window.__run.on = true;
    window.__run.t0 = performance.now();
    const tick = () => {
      const t = Math.round(performance.now() - window.__run.t0);
      const sq = findSquare(), card = findCard(), mark = findMark();
      const rect = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
      window.__run.samples.push({
        t,
        sq: sq ? { a: Math.round(area(sq)), o: Number(eff(sq).toFixed(3)), r: rect(sq) } : null,
        card: card ? { a: Math.round(area(card)), o: Number(eff(card).toFixed(3)), r: rect(card) } : null,
        frames: [...document.querySelectorAll('img[src*="/marks/"][src*="-x"]')]
          .map((i) => Number(getComputedStyle(i).opacity).toFixed(3)),
        markSrc: mark ? mark.src.split('/').pop() : null,
        h1: (() => { const h = document.querySelector('h1'); return h ? { o: Number(getComputedStyle(h).opacity), s: Number(new DOMMatrixReadOnly(getComputedStyle(h).transform).a.toFixed(4)) } : null; })(),
      });
      /* Bounded by the sequence, not by a guess at how long a generation takes.
         The first window was 45s; production took longer than that, so the
         sampler stopped while the square was still on screen and recorded a run
         in which the reveal never happened. It stops 8s after frame one paints,
         or after three minutes if it never does. */
      if (card && window.__run.cardAt === null) window.__run.cardAt = performance.now();
      const past = window.__run.cardAt !== null && performance.now() - window.__run.cardAt > 8000;
      if (!past && performance.now() - window.__run.t0 < 180000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
});

const shots = [];
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

try {
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /begin your blueprint/i }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /i create my fate/i }).click();
  await page.waitForTimeout(600);

  const stamp = Date.now();
  const answers = [
    'Checkbot',
    '1990-04-05',
    '08:30',
    'Detroit, United States',
    'That I am not as good as people think and that they will find out.',
    'To finish the record and tour it in small rooms without apologising for any of it.',
    'I get to ninety percent and then I start over.',
    EMAIL.replace('@', `+cr${stamp}@`),
  ];
  for (let step = 0; step < answers.length; step++) {
    await page.waitForTimeout(500);
    const field = page.locator('input:visible, textarea:visible').first();
    await field.waitFor({ state: 'visible', timeout: 20000 });
    await field.fill(answers[step]);
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
  }
  ok('the eight questions were accepted', true);

  /* Sampling starts here — on the loading screen, before the reading lands. */
  await page.evaluate(() => window.__startRun());
  const runStarted = Date.now();

  /* Continuous capture, so the hand-over is on film and not only in numbers.
     Screenshots would stall the page; the screencast runs in the browser. */
  const cdp = await ctx.newCDPSession(page);
  /* A rolling fourteen seconds. The wait is a minute of a motionless square and
     filming all of it at 60fps just fills memory with the same picture; what
     matters is the hand-over and everything after it. */
  cdp.on('Page.screencastFrame', async (f) => {
    shots.push({ ms: Date.now() - runStarted, data: f.data });
    const cutoff = shots[shots.length - 1].ms - 14000;
    while (shots.length && shots[0].ms < cutoff) shots.shift();
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 430, maxHeight: 800 });

  await page.locator('h1').filter({ hasText: /^THE [A-Z ]+$/ }).first()
    .waitFor({ state: 'visible', timeout: 180000 });
  await page.waitForFunction(() => window.__run.cardAt !== null
    && performance.now() - window.__run.cardAt > 7000, null, { timeout: 30000 }).catch(() => {});
  await cdp.send('Page.stopScreencast').catch(() => {});

  const run = await page.evaluate(() => window.__run);
  await writeFile(`${OUT}/prod-samples.json`, JSON.stringify(run.samples));

  const S = run.samples;
  const vis = (o) => o && o.a > 100 && o.o > 0.01;
  const lastSquare = [...S].reverse().find((s) => vis(s.sq));
  const firstCard = S.find((s) => vis(s.card));

  ok('the reveal ran the crystallization', !!firstCard,
    firstCard ? `frame x1 first painted at ${firstCard.t}ms into the wait` : 'no x1 ever appeared');

  if (lastSquare && firstCard) {
    const between = S.filter((s) => s.t > lastSquare.t && s.t < firstCard.t);
    const blank = between.filter((s) => !vis(s.sq) && !vis(s.card));
    ok('no frame renders with neither object on screen',
      blank.length === 0,
      `square last seen ${lastSquare.t}ms, card first seen ${firstCard.t}ms, ` +
      `${between.length} frame(s) in between, ${blank.length} of them empty`);
    ok('the square is full black when it hands over',
      lastSquare.o > 0.99, `effective opacity ${lastSquare.o}`);
    ok('frame one arrives at full opacity, not faded in',
      firstCard.o > 0.99, `effective opacity ${firstCard.o} on its first painted frame`);
    console.log(`\n    square at hand-over: ${lastSquare.r.join(', ')}   (x, y, w, h)`);
    console.log(`    card on arrival:     ${firstCard.r.join(', ')}`);
  }

  /* The sequence itself, re-based on frame one. */
  if (firstCard) {
    const base = firstCard.t;
    const at = (pred) => { const s = S.find((x) => x.t >= base && pred(x)); return s ? s.t - base : null; };
    const resolved = at((s) => s.frames.length > 1 && s.frames.every((f) => Number(f) >= 0.999));
    const nameOn = at((s) => (s.h1?.o ?? 0) > 0.99);
    const nameScale = S.find((x) => x.t >= base && (x.h1?.o ?? 0) > 0.99)?.h1?.s;
    console.log('\n  beat                     measured    spec');
    const row = (l, g, w) => console.log(`    ${l.padEnd(22)}${String(g === null ? '—' : g + 'ms').padStart(8)}    ${w}`);
    row('crystallization ends', resolved, '1600ms');
    row('name stamps in', nameOn, '2600ms');
    console.log(`    ${'  scale when it lands'.padEnd(22)}${String(nameScale ?? '—').padStart(8)}    1.04`);

    const hold = S.filter((s) => s.t > base + (resolved ?? 1600) + 60 && s.t < base + (nameOn ?? 2600) - 60);
    const dirty = hold.filter((s) => (s.h1?.o ?? 0) > 0.01);
    ok('the hold is silent', dirty.length === 0,
      `${hold.length} frames between resolve and stamp, ${dirty.length} with the name showing`);
  }

  await writeFile(`${OUT}/prod-frames.json`, JSON.stringify(shots));
  console.log(`\n  ${shots.length} screencast frames captured`);
} catch (err) {
  ok('ran to completion', false, String(err).split('\n')[0].slice(0, 160));
  await page.screenshot({ path: `${OUT}/prod-failure.png` }).catch(() => {});
} finally {
  /* Always. A failed run must not leave a real address in the database. */
  try {
    await page.goto(`${URL_}/delete`, { waitUntil: 'networkidle' });
    const start = page.getByRole('button', { name: /^delete my data$/i }).first();
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await page.getByRole('button', { name: /yes, delete everything/i }).first().click();
      await page.getByText(/your data has been deleted/i).waitFor({ timeout: 30000 });
      ok('the run deleted its own account', true);
    } else {
      ok('the run deleted its own account', true, 'nothing to delete');
    }
  } catch (err) {
    ok('the run deleted its own account', false, `CLEAN UP BY HAND — ${String(err).split('\n')[0].slice(0, 100)}`);
  }
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
