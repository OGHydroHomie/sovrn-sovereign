/**
 * The front page, at 375px by default and 1440 with W=1440 H=900.
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
/* The page has to hold at both ends. 375 is the phone it was designed to and
   1440 is the desktop nobody was checking. W/H override rather than a second
   file, so the two runs cannot drift apart. */
const W = Number(process.env.W ?? 375);
const H = Number(process.env.H ?? 800);

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

await probe({ url: URL_, name: `marketing-${W}`, viewport: { width: W, height: H } }, async ({ page, url }) => {
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
  /* Everything above the fold, with the head, the lead, the control and the
     three facts removed. Whatever is left is what should not be there. */
  const leftover = heroText
    .replace(/Everything else tells you who you could be\./i, '')
    .replace(/This one makes you find out\./i, '')
    .replace(/Three questions and your birth details name who you.{1,3}re becoming, and the loop you.{1,3}ve been running instead\./i, '')
    .replace(/Then it stops describing you, and starts asking\./i, '')
    .replace(/get today.{1,3}s act/i, '')
    .replace(/Three questions\. Five minutes\. Free\./i, '')
    .trim();
  check('the head, the lead, the control, and nothing else', leftover === '', JSON.stringify(leftover.slice(0, 90)));

  /* The inversion, asserted rather than assumed: the head carries the thing
     nothing else in the field does, and the worn claim — "who you're becoming"
     — is held back for the lead. A head that drifts back onto the claim is the
     exact regression this page was rebuilt to undo. */
  const head = (await page.locator('[data-hero] [data-head]').innerText()).replace(/\s+/g, ' ').trim();
  const lead = (await page.locator('[data-hero] [data-lead]').allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  check('the head does not lead on the worn claim', !/becoming/i.test(head), JSON.stringify(head));
  check('and the claim is restated in the lead', /who you.{1,3}re becoming/i.test(lead));

  /* The first screen is the whole ask now, not a line and a button. If the
     control falls below the fold on the smallest phone, the page asks for the
     sale somewhere the reader cannot see. */
  const fold = await page.evaluate(() => {
    const el = document.querySelector('[data-hero] [data-call]');
    if (!el) return null;
    return { bottom: el.getBoundingClientRect().bottom, vh: window.innerHeight };
  });
  check('the control is above the fold', fold !== null && fold.bottom <= fold.vh,
    `control bottom ${Math.round(fold?.bottom ?? -1)}px of ${fold?.vh}px`);
  const spill = await page.evaluate(() => {
    const h = document.querySelector('[data-hero]');
    return { h: Math.round(h.getBoundingClientRect().height), vh: window.innerHeight };
  });
  check('and the hero does not outgrow the screen', spill.h <= spill.vh + 1,
    `${spill.h}px in ${spill.vh}px`);

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

  // ── The header ───────────────────────────────────────────────────────────
  const header = page.locator('[data-site-header]');
  check('there is a header, and it stays', await header.count() === 1);
  check('the wordmark is on it', (await header.innerText()).toUpperCase().includes('SOVRN'),
    (await header.innerText()).replace(/\s+/g, ' ').trim());
  check('and on its own page it is not a link',
    await page.locator('[data-wordmark="inert"]').count() === 1
    && await page.locator('[data-wordmark="link"]').count() === 0);
  check('The Wall is a route out', (await page.locator('[data-nav="wall"]').getAttribute('href')) === '/wall');
  check('and a stranger is offered Begin',
    (await page.locator('[data-nav="begin"]').getAttribute('href')) === '/begin'
    && await page.locator('[data-nav="ledger"]').count() === 0);
  const stuck = await header.evaluate((el) => getComputedStyle(el).position);
  check('the header is persistent', stuck === 'sticky' || stuck === 'fixed', stuck);

  // ── Below the fold ───────────────────────────────────────────────────────
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  check('the wound is there, unheadered', /Knowing was never the problem/.test(body));
  check('the belief that keeps him still is contradicted, not the competitors',
    /You were told a lie/.test(body)
    && /the getting ready became the life/i.test(body)
    && /only the one who starts anyway/i.test(body));
  check('the mechanism is stated in full',
    /Tomorrow at six, it asks what happened/.test(body)
    && /Either answer is the input/.test(body));
  check('the birth details are answered rather than left hanging',
    /an input, not a prophecy/.test(body) && /the record wins/.test(body));

  /* Order is the argument here, not decoration: the proof has to land one block
     after the mechanism claim rather than at the foot of the page, and the
     thirteen have to come after belief rather than opening the ad. Read off the
     rendered document so a reshuffle in the JSX cannot pass silently. */
  const order = await page.evaluate(() => {
    const at = (re) => {
      const el = [...document.querySelectorAll('[data-reveal] p, [data-reveal] [data-count]')]
        .find((n) => re.test(n.innerText));
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : Infinity;
    };
    return {
      wound: at(/Knowing was never the problem/),
      lie: at(/You were told a lie/),
      mechanism: at(/Either answer is the input/),
      proof: at(/Every act\. Every miss\./),
      thirteen: at(/No card is ahead of another/),
      birth: at(/an input, not a prophecy/),
      close: at(/something will ask whether you did it/),
    };
  });
  const seq = ['wound', 'lie', 'mechanism', 'proof', 'thirteen', 'birth', 'close'];
  check('the page runs wound → lie → mechanism → proof → thirteen → birth → close',
    seq.every((k, i) => i === 0 || order[seq[i - 1]] < order[k]),
    seq.map((k) => `${k}:${order[k] === Infinity ? 'missing' : order[k]}`).join('  '));
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

  // ── The breaks ───────────────────────────────────────────────────────────
  const breaks = await page.locator('[data-break]').count();
  check('the sections are separated by a rule', breaks >= 5, `${breaks}`);
  /* The lie is set in four groups with its line breaks intact. Reflowed into
     prose it still reads, which is why nothing else here would catch it. */
  const lie = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-reveal]')]
      .find((n) => /You were told a lie/.test(n.innerText));
    if (!el) return null;
    const groups = [...el.querySelectorAll('p')];
    return {
      groups: groups.length,
      lines: groups.map((g) => g.querySelectorAll('span').length),
      tops: groups.map((g) => Math.round(g.getBoundingClientRect().top)),
    };
  });
  check('the lie keeps its four groups and its breaks',
    lie !== null && lie.groups === 4 && JSON.stringify(lie.lines) === JSON.stringify([0, 2, 2, 2]),
    lie ? `${lie.groups} groups, lines ${lie.lines.join('/')}` : 'missing');
  const rule = await page.locator('[data-break] > div').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const parent = el.parentElement.getBoundingClientRect();
    return { frac: r.width / parent.width, height: r.height, centred: Math.abs((r.left - parent.left) - (parent.right - r.right)) < 2 };
  });
  check('a hairline at 30%, centred', Math.abs(rule.frac - 0.30) < 0.02 && rule.height <= 1.5 && rule.centred,
    `${(rule.frac * 100).toFixed(0)}% wide, ${rule.height}px, ${rule.centred ? 'centred' : 'off-centre'}`);
  check('and nothing is drawn around a section',
    await page.locator('[data-reveal]').evaluateAll((els) => els.every((el) => {
      const cs = getComputedStyle(el);
      return cs.borderTopWidth === '0px' && /rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor);
    })));

  /* The film, when there is one. An empty bordered 16:9 hole on a page arguing
     that this is the one that checks reads as something that did not ship — a
     proof-shaped container with no proof in it. So the slot is absent until
     there is footage, and 16:9 is asserted only when it is actually there. */
  const slot = page.locator('[data-video]');
  const slots = await slot.count();
  if (slots === 0) {
    check('with no footage, no empty frame is drawn', true, 'slot absent');
  } else {
    check('the slot only exists when it is filled',
      await slot.getAttribute('data-video') === 'ready'
      && await page.locator('[data-video] video').count() === 1);
    const ratio = await slot.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width / r.height;
    });
    check('and it is 16:9', Math.abs(ratio - 16 / 9) < 0.05, ratio.toFixed(3));
  }

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
  /* The unflattering half is the asset, and it is a claim about the record
     rather than about a rate — "most of them" would be a number we do not
     have. */
  check('the record admits the misses',
    /the days nothing happened are on there too/i.test(body));

  check('the record points at the wall',
    (await page.getByRole('link', { name: /see the wall/i }).getAttribute('href')) === '/wall');

  const calls = await page.locator('[data-call]').count();
  check('the same control closes the page', calls === 2, `${calls}`);
  /* The line that used to be the headline is now the close, where a page of
     belief has been spent on it — and it is never above the fold. */
  const heroHas = /You already know the thing/.test(
    (await page.locator('[data-hero]').innerText()));
  check('the recognition line closes rather than opens',
    !heroHas && /You already know the thing/.test(body));

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
  // ── Scroll behaviour ─────────────────────────────────────────────────────
  /* On a fresh load. The lazy-loading check above scrolls to the grid, and
     the reveals are once-only — measuring "starts hidden" after something has
     already scrolled the page measures nothing at all. */
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const before = await page.locator('[data-reveal] [data-rise]').evaluateAll(
    (els) => els.map((el) => Number(getComputedStyle(el).opacity)));
  check('type below the fold starts hidden', before.filter((o) => o < 0.1).length >= 8,
    `${before.filter((o) => o < 0.1).length}/${before.length} hidden at the top`);

  const density = [];
  for (const frac of [0, 0.35, 0.7, 1]) {
    await page.evaluate((f) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * f), frac);
    await page.waitForTimeout(900);
    density.push(await page.evaluate(() => {
      const c = document.querySelector('canvas[data-ascent-field]');
      const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
      let on = 0, count = 0;
      for (let i = 0; i < d.length; i += 4 * 17) { count++; if (d[i] > 128) on++; }
      return on / count;
    }));
  }
  console.log(`      field: ${density.map((x) => (x * 100).toFixed(2) + '%').join(' → ')}`);
  /* Against the densest point of the reading, not against one fixed sample.
     The type is cleared now, so whichever of the two middle samples happens to
     land on a block of prose reads near zero — which says the clearing works,
     not that the field has stopped thinning. */
  check('the field thins as the page goes down',
    Math.max(density[1], density[2]) > density[3] * 1.5,
    density.map((x) => (x * 100).toFixed(2)).join(' → '));

  /* The thing this page was losing: stars landing inside the words. The canvas
     is the viewport over the field's scale, so a block's screen rect maps onto
     it directly. Nothing lit inside a block of prose, at any width. */
  const inType = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-ascent-field]');
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const sx = c.width / innerWidth, sy = c.height / innerHeight;
    const out = [];
    for (const el of document.querySelectorAll('[data-hero-type], [data-reveal]')) {
      if (el.querySelector('[data-thirteen]')) continue;      // pictures, not type
      const b = el.getBoundingClientRect();
      if (b.bottom <= 0 || b.top >= innerHeight || b.width <= 0) continue;
      const x0 = Math.max(0, Math.floor(b.left * sx)), x1 = Math.min(c.width, Math.ceil(b.right * sx));
      const y0 = Math.max(0, Math.floor(b.top * sy)), y1 = Math.min(c.height, Math.ceil(b.bottom * sy));
      if (x1 <= x0 || y1 <= y0) continue;
      const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let on = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 128) on++;
      out.push(on);
    }
    return out;
  });
  check('and no star lands inside the words',
    inType.length > 0 && inType.every((n) => n === 0),
    `${inType.length} blocks on screen, lit: ${inType.join('/')}`);
  check('and never turns the page to paper', density.every((x) => x < 0.25),
    `${(Math.max(...density) * 100).toFixed(1)}% at its densest`);

  const after = await page.locator('[data-reveal] [data-rise]').evaluateAll(
    (els) => els.map((el) => Number(getComputedStyle(el).opacity)));
  check('and every line has arrived by the bottom', after.every((o) => o > 0.95),
    `${after.filter((o) => o > 0.95).length}/${after.length}`);

  const resolved = await page.locator('[data-figure][data-resolved="yes"]').count();
  check('the thirteen resolve as they enter', resolved === 13, `${resolved}/13`);

  // ── Reduced motion ───────────────────────────────────────────────────────
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  check('reduced motion gets one static card',
    await page.locator('[data-idle="static"]').count() === 1);
  check('and nothing is looping', await page.locator('[data-idle] canvas[data-crystallization]').count() === 0);
  check('the card is still there', await page.locator('[data-idle] img, [data-idle] div').count() > 0);
  const still = await page.locator('[data-reveal] [data-rise]').evaluateAll(
    (els) => els.map((el) => ({ o: Number(getComputedStyle(el).opacity), t: getComputedStyle(el).transform })));
  check('and every line is already in its final state',
    still.length > 0 && still.every((x) => x.o > 0.95 && (x.t === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(x.t))),
    `${still.filter((x) => x.o > 0.95).length}/${still.length} shown`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.goto(`${url}/begin`, { waitUntil: 'networkidle' });
  const begun = await page.locator('body').innerText();
  check('/begin is the door', /ascend|i create my fate|sovrn/i.test(begun) && !/Everything else tells you/.test(begun));

  await page.goto(`${url}/nonsense-path`, { waitUntil: 'networkidle' });
  check('an unknown path lands on the front page',
    /Everything else tells you who you could be/.test(await page.locator('body').innerText()));
});

console.log(`\n  ${W}\u00d7${H}: ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
