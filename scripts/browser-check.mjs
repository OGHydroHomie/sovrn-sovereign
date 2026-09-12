#!/usr/bin/env node
/**
 * Open the product in a real browser and use it.
 *
 * Everything that reached production this week was invisible to type checks,
 * builds and content greps, and obvious within one second of looking at a
 * screen: cards that opened to nothing because a panel sat at opacity 0, a
 * sample blurred to a smudge, body text at 2.70:1. Those checks answer "does it
 * compile and did it deploy". This one answers "does it work".
 *
 * It drives the whole loop — hero, threshold, eight questions, generation,
 * reveal, naming a target, committing, filing — and asserts what could not have
 * been caught any other way: the panels open and contain the reading, the card
 * exports a real image, a target is admitted and narrowed with a boundary shown
 * before anything is attempted, the boundary survives a reload, and a filing
 * that meets it closes the cycle onto the record.
 *
 *   node scripts/browser-check.mjs --url https://www.sovrn.online \
 *                                   --email you+bc@gmail.com
 *
 * To clear a killed run's account without starting another:
 *
 *   node scripts/browser-check.mjs --url https://www.sovrn.online --cleanup-only
 *
 * This performs a REAL generation against whatever URL it is given: it spends
 * model tokens, writes a row, and — because question eight captures an address —
 * causes the app to send a real confirmation email.
 *
 * --email is required for exactly that reason. The first two runs used an
 * @example.invalid address and produced two hard bounces against the sending
 * domain, because .invalid does not resolve. Give it a real inbox you own; a
 * plus-tag is ideal.
 *
 * The account it creates deletes itself through the product's own /delete flow,
 * which leaves no residue and exercises that path as a side effect. Pass --keep
 * to leave it behind.
 *
 * That deletion runs at BOTH ends. At the end, in a finally, so a failed
 * assertion still cleans up. And at the start, against whatever the previous run
 * recorded, because a finally is not reached when the process is killed, the
 * machine sleeps, or a timeout kills the harness from outside — and every run
 * that does not clean up leaves a real account in the database. Fifty-nine empty
 * anonymous accounts had accumulated before this existed. Cleanup that only runs
 * on the way out is not cleanup; it is cleanup on the happy path with extra
 * steps.
 */
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* Where a run records the account it just created, so the next run can delete it
   even if this one never reaches its own finally. Kept beside the script and out
   of git — it holds a live session token. */
const STATE = join(dirname(fileURLToPath(import.meta.url)), '.browser-check-session.json');

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const URL_ = (arg('url', 'https://www.sovrn.online')).replace(/\/$/, '');
const HEADED = process.argv.includes('--headed');
const SHOTS = arg('shots', '');
const EMAIL = arg('email', '');
const KEEP = process.argv.includes('--keep');
/* Clear the previous run's account and stop, without starting a new one. The
   sweep is otherwise only reachable by beginning another run, which creates
   another account to clean up — a cleanup you cannot run on its own is a
   cleanup that never finishes. */
const CLEANUP_ONLY = process.argv.includes('--cleanup-only');

/* --cleanup-only never reaches question eight, so it never sends anything and
   has no use for an address. */
if (!CLEANUP_ONLY
    && (!EMAIL || EMAIL.endsWith('.invalid') || EMAIL.endsWith('.test') || EMAIL.endsWith('.example'))) {
  console.error(
    'browser-check: --email is required and must be a real, deliverable address.\n'
    + '  Question eight captures it and the app sends a confirmation, so an\n'
    + '  unroutable domain becomes a hard bounce against the sending domain.\n'
    + '  Use a plus-tag on an inbox you own: --email you+bc@gmail.com'
  );
  process.exit(2);
}

/* A blank cream 1080x1350 PNG compresses to 6217 bytes. A card carrying a 480px
   mark and three lines of type cannot be that small, so anything near it means
   the canvas exported empty. */
const BLANK_CARD_BYTES = 6217;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/* Drive the product's own delete flow on a page that holds the session. */
async function deleteVia(p) {
  await p.goto(`${URL_}/delete`, { waitUntil: 'networkidle', timeout: 60000 });
  const start = p.getByRole('button', { name: /^delete my data$/i }).first();
  if (!(await start.isVisible().catch(() => false))) return 'nothing to delete';
  await start.click();
  await p.getByRole('button', { name: /yes, delete everything/i }).first().click();
  await p.getByText(/your data has been deleted/i).waitFor({ timeout: 30000 });
  return 'deleted';
}

/* The same flow, in a throwaway context seeded with a session from disk — which
   is how a previous run's account is reached from a browser that never had it.
   Seeding happens in an init script so the entries are in localStorage before
   any app code reads them. */
async function deleteRecorded(browser, session) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((entries) => {
    try {
      for (const [k, v] of entries) localStorage.setItem(k, v);
    } catch { /* about:blank and friends have no usable storage */ }
  }, session.storage);
  try {
    return await deleteVia(await ctx.newPage());
  } finally {
    await ctx.close();
  }
}

/* Record the account this run is using, the moment it exists. */
async function rememberSession(page) {
  const storage = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sovrn_'))
      .map((k) => [k, localStorage.getItem(k)]));
  if (!storage.length) return false;
  await writeFile(STATE, JSON.stringify({ url: URL_, at: new Date().toISOString(), storage }));
  return true;
}

const forget = () => unlink(STATE).catch(() => undefined);

const browser = await chromium.launch({ headless: !HEADED });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },      // iPhone-ish, where the bug was found
  deviceScaleFactor: 2,
  acceptDownloads: true,
});
const page = await context.newPage();

/* The hand-over between the loading screen and the reveal.

   The crystallization opens on frame one of the mark at full card size, and it
   is meant to continue the black square the loading screen just finished
   filling — no fade, no gap, no flash of empty paper between two screens. That
   is a claim about a single animation frame, so it is checked by sampling every
   animation frame and asserting that no rendered frame has neither object on it.
   Nothing else in this file can see a defect that lasts 16ms. */
await page.addInitScript(() => {
  window.__seam = { on: false, t0: 0, cardAt: null, samples: [] };
  const vis = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    let o = 1, n = el;
    while (n && n !== document.body) { o *= Number(getComputedStyle(n).opacity); n = n.parentElement; }
    return { area: Math.max(0, r.width) * Math.max(0, r.height), o: Number(o.toFixed(3)) };
  };
  window.__seam.start = () => {
    const s = window.__seam;
    if (s.on) return;
    s.on = true;
    s.t0 = performance.now();
    const tick = () => {
      /* The loading square is the only 2px black-bordered box in the product;
         the card is the only thing that ever shows frame one of a mark. */
      /* The loading square: the only 2px-bordered box in the product. Its
         colour is not a reliable way to find it — on a dark ground it is set in
         paper, so looking for a black border finds nothing and the whole
         assertion quietly stops testing anything. Shape and size are what it
         actually is. */
      const square = [...document.querySelectorAll('div')].find((d) => {
        const cs = getComputedStyle(d);
        if (cs.borderTopWidth !== '2px') return false;
        const r = d.getBoundingClientRect();
        return r.width > 80 && Math.abs(r.width - r.height) < 4;
      });
      /* The crystallization is a canvas now, not a stack of images. Looking for
         the old img selector would find nothing, report "it did not run this
         time", and pass — an assertion that cannot fail is worse than none. */
      const card = document.querySelector('canvas[data-crystallization], img[src*="-x1.png"]');
      /* And a canvas that exists is not a canvas with anything on it. Ink is
         what counts, so the first frames are sampled for actual dark pixels. */
      let ink = 0;
      if (card && card.tagName === 'CANVAS' && card.width > 0) {
        try {
          const t = document.createElement('canvas');
          t.width = Math.min(64, card.width); t.height = Math.min(96, card.height);
          const cc = t.getContext('2d');
          cc.drawImage(card, 0, 0, t.width, t.height);
          const d = cc.getImageData(0, 0, t.width, t.height).data;
          let dark = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 8 && d[i] < 128) dark++;
          ink = dark / (d.length / 4);
        } catch { ink = -1; }
      } else if (card) {
        ink = 1;
      }
      s.samples.push({ t: Math.round(performance.now() - s.t0), sq: vis(square), card: vis(card), ink });
      if (card && ink > 0.001 && s.cardAt === null) s.cardAt = performance.now();
      const done = s.cardAt !== null && performance.now() - s.cardAt > 4000;
      if (!done && performance.now() - s.t0 < 180000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
});
page.on('pageerror', (e) => check('no uncaught page errors', false, e.message.slice(0, 120)));

console.log(`browser-check: ${URL_}\n`);

/* Before anything else: whatever the last run left behind. */
if (!KEEP) {
  let prior = null;
  try { prior = JSON.parse(await readFile(STATE, 'utf8')); } catch { /* none, which is the normal case */ }
  if (prior && prior.url !== URL_) {
    check('previous run left nothing behind', false,
      `a session for ${prior.url} is on disk — run against that URL to clear it`);
  } else if (prior) {
    try {
      const outcome = await deleteRecorded(browser, prior);
      await forget();
      check('previous run left nothing behind', true, `${outcome} (recorded ${prior.at})`);
    } catch (err) {
      check('previous run left nothing behind', false,
        `could not delete the account from ${prior.at} — ${String(err).split('\n')[0].slice(0, 90)}`);
    }
  } else if (CLEANUP_ONLY) {
    check('previous run left nothing behind', true, 'no session on disk');
  }
}

if (CLEANUP_ONLY) {
  await browser.close();
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed`);
  process.exit(bad.length ? 1 : 0);
}
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

try {
  // ── Hero ──────────────────────────────────────────────────────────────────
  await page.goto(URL_, { waitUntil: 'networkidle', timeout: 60000 });
  const heroHeading = await page.locator('h1').first().innerText();
  check('hero renders a heading', heroHeading.trim().length > 0, JSON.stringify(heroHeading.trim().slice(0, 44)));

  /* The app mints its anonymous identity on mount, so the account exists here —
     before a single question is answered. Record it now rather than after the
     quiz: a crash on question three creates exactly the same row as a crash on
     question eight, and only one of those was ever being cleaned up. */
  if (!KEEP) {
    const remembered = await rememberSession(page);
    check('this run recorded its account for the next one', remembered,
      remembered ? 'written to scripts/.browser-check-session.json' : 'no session in localStorage yet');
  }
  await shot('01-hero');

  await page.getByRole('button', { name: /begin your blueprint/i }).first().click();
  await page.waitForTimeout(600);
  {
    const h = (await page.locator('h1').first().innerText()).trim();
    check('threshold stands between hero and question one', h === 'This life is yours. Take the reins.');
    await page.getByRole('button', { name: /i create my fate/i }).click();
  }

  // ── The eight questions ───────────────────────────────────────────────────
  const stamp = Date.now();
  const answers = [
    'Checkbot',
    '1990-04-05',
    '08:30',
    'Detroit, United States',
    'That I am not as good as people think and that they will find out.',
    'To finish the record and tour it in small rooms without apologising for any of it.',
    'I get to ninety percent and then I start over.',
    EMAIL.replace('@', `+bc${stamp}@`),
  ];

  /* Wait for the question itself to change rather than for a number of
     milliseconds. The last four questions are a climb, and a climb refuses a
     second advance until it settles 1.2s later — so a harness pacing its clicks
     at 500ms had its clicks silently ignored, typed the next answer into the
     same field, and never reached question eight at all. The run then sat for
     three minutes waiting for a reveal that was never coming. Waiting on the
     product's own state is the only pacing that cannot go stale. */
  const headingNow = async () =>
    (await page.locator('h2').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

  for (let step = 0; step < answers.length; step++) {
    const before = await headingNow();
    const field = page.locator('input:visible, textarea:visible').first();
    await field.waitFor({ state: 'visible', timeout: 20000 });
    await field.fill(answers[step]);

    // Q4 is an autocomplete; Q8 has the consent box.
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
      /* The question has to actually change before the next answer is typed.
         Question four hands off to the chart-insight reveal for three seconds
         before question five appears, so this waits through that too. */
      await page.waitForFunction(
        (was) => {
          const h = document.querySelector('h2');
          const now = (h?.textContent ?? '').replace(/\s+/g, ' ').trim();
          return now !== '' && now !== was;
        },
        before, { timeout: 30000, polling: 'raf' },
      );
      /* And a beat past the climb's settle, so the next click is not refused. */
      await page.waitForTimeout(450);
    }
  }
  check('quiz accepted all eight answers', true);
  await page.evaluate(() => window.__seam.start());
  await shot('02-loading');

  // ── Generation and the reveal ─────────────────────────────────────────────
  const revealed = page.getByRole('button', { name: /who you are/i }).first();
  await revealed.waitFor({ state: 'visible', timeout: 180000 });
  check('reveal renders after generation', true);
  /* Wait for the reveal to finish arriving, rather than for a number of
     seconds. The crystallization sequence holds the three sections back until
     4.0s, and a flat 3000ms here clicked a card while it was still rising and
     then measured it at 0.15 opacity — a harness racing the product and
     reporting the product as broken. Waiting on the thing itself survives the
     next timing change too. */
  await page.waitForFunction(() => {
    const roots = [...document.querySelectorAll('button')]
      .filter((b) => /WHO YOU ARE|THE PATTERN|ONE ACT/.test(b.textContent ?? ''))
      .map((b) => b.parentElement)
      .filter(Boolean);
    return roots.length === 3 && roots.every((el) => Number(getComputedStyle(el).opacity) > 0.99);
  }, null, { timeout: 20000, polling: 'raf' }).catch(() => {});
  await page.waitForTimeout(300);   // and a beat past the last easing frame
  await shot('03-reveal');

  /* The hand-over. Read before anything else on this page is touched. */
  {
    const seam = await page.evaluate(() => window.__seam.samples);
    const on = (o) => o && o.area > 100 && o.o > 0.01;
    const lastSquare = [...seam].reverse().find((x) => on(x.sq));
    const firstInk = seam.find((x) => on(x.card) && x.ink > 0.001);

    if (!firstInk) {
      /* No crystallization ran — the frames did not decode in time, which is a
         legitimate outcome and not a seam. Say so rather than passing quietly. */
      check('the ink arrives within a beat of the square leaving', true,
        'crystallization did not run this time; the finished mark was used');
    } else if (!lastSquare) {
      check('the ink arrives within a beat of the square leaving', false,
        'the loading square was never seen, so the hand-over cannot be judged');
    } else {
      /* The ink now *enters* rather than being on screen whole, so the old
         "no blank frame" reading no longer applies: there is by design a moment
         of empty card before the first drop. What still has to hold is that the
         gap is a beat and not a pause. */
      const gap = firstInk.t - lastSquare.t;
      check('the ink arrives within a beat of the square leaving', gap >= 0 && gap < 400,
        `square last at ${lastSquare.t}ms, first ink at ${firstInk.t}ms — ${gap}ms`);
    }
  }

  const name = (await page.locator('h1').first().innerText()).trim();
  check('archetype name is on the reveal', /^THE [A-Z ]+$/.test(name), JSON.stringify(name));

  /* The mark is a 1080x1620 raster drawn into a box the component sizes from
     MARK_ASPECT. When that constant is wrong the image still loads and still
     occupies space — it just letterboxes inside a box of the wrong shape. So
     check the rendered box against the file's own dimensions, not against a
     minimum width. */
  const mark = await page.locator('img[src*="/marks/"]').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      natural: [el.naturalWidth, el.naturalHeight],
      renderedRatio: r.width / r.height,
      naturalRatio: el.naturalWidth / el.naturalHeight,
      width: r.width,
    };
  }).catch(() => null);
  check('archetype mark occupies space', !!mark && mark.width > 100, mark ? `${Math.round(mark.width)}px wide` : 'not found');
  check(
    'archetype mark is drawn at the file\'s own aspect',
    !!mark && Math.abs(mark.renderedRatio - mark.naturalRatio) < 0.005,
    mark ? `rendered ${mark.renderedRatio.toFixed(4)} vs file ${mark.naturalRatio.toFixed(4)} (${mark.natural.join('x')})` : 'no mark'
  );

  // ── The three panels. This is the bug that shipped. ───────────────────────
  /* ONE ACT opens by default — the act is meant to be the loudest thing on the
     reveal, not a drawer you have to find. So clicking every header blindly
     closes the one panel that matters. Drive each panel to open by reading
     aria-expanded rather than assuming the starting state. */
  for (const header of ['WHO YOU ARE', 'THE PATTERN', 'ONE ACT']) {
    const button = page.getByRole('button', { name: new RegExp(header, 'i') }).first();
    const startsOpen = (await button.getAttribute('aria-expanded')) === 'true';
    check(`${header}: ${header === 'ONE ACT' ? 'opens by default' : 'starts closed'}`,
      startsOpen === (header === 'ONE ACT'), `aria-expanded=${startsOpen}`);
    if (!startsOpen) await button.click();
    await page.waitForTimeout(900);

    const panelId = await button.getAttribute('aria-controls');
    // React's useId() produces ids containing colons, which are not valid in a
    // CSS id selector without escaping. An attribute selector sidesteps it.
    const panel = page.locator(`[id="${panelId}"]`);
    const box = await panel.boundingBox();
    const text = (await panel.innerText()).trim();
    const opacity = await panel.evaluate((el) => {
      // The exact failure: a panel at opacity 0 with content inside it.
      let node = el, effective = 1;
      while (node && node !== document.body) {
        effective *= Number(getComputedStyle(node).opacity);
        node = node.parentElement;
      }
      return effective;
    });

    check(`${header}: panel opens`, !!box && box.height > 40, box ? `${Math.round(box.height)}px tall` : 'zero height');
    check(`${header}: panel is visible`, opacity > 0.95, `effective opacity ${opacity.toFixed(2)}`);
    check(`${header}: panel contains the reading`, text.length > 120, `${text.length} chars`);
  }
  await shot('04-expanded');

  // ── The target. Named, narrowed, bounded, before any act exists. ─────────
  const naming = page.getByText(/what have you been putting off/i).first();
  await naming.waitFor({ state: 'visible', timeout: 20000 });
  check('the reveal asks for a target before offering an act', true);

  await page.locator('textarea').first().fill('Leave my job and start a business');
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.waitForTimeout(500);

  await page.getByText(/what does it cost you/i).first().waitFor({ state: 'visible', timeout: 10000 });
  check('the cost question is required before admission', true);
  await page.locator('textarea').first().fill(
    'I am forty-one and I keep saying next year. My kids will remember me as someone who talked about it.'
  );
  await page.getByRole('button', { name: /set the target/i }).click();

  const admitted = page.getByRole('button', { name: /that's it/i });
  await admitted.waitFor({ state: 'visible', timeout: 120000 });
  const narrowing = await page.locator('body').innerText();
  check('the narrowing is shown before it is accepted', /try this instead|the target/i.test(narrowing));
  const rubricLine = (narrowing.match(/Crossed when[^\n]+/i) ?? [''])[0].trim();
  check('a boundary is shown, and it is crossable alone', rubricLine.length > 20, rubricLine.slice(0, 74));
  check('the boundary is not another person\'s decision',
    !/\b(they|he|she)\s+(agree|accept|approve|repl|respond|say yes)/i.test(rubricLine));
  await admitted.click();
  await page.waitForTimeout(2500);

  // ── Commit, file, cross ──────────────────────────────────────────────────
  // The ONE ACT panel re-renders when the target is admitted, so it is opened
  // again rather than assumed to still be open.
  const oneAct = page.getByRole('button', { name: /one act/i }).first();
  if ((await oneAct.getAttribute('aria-expanded')) !== 'true') await oneAct.click();
  await page.waitForTimeout(900);

  /* Target the act by its label, not by "I COMMIT". The accessible name of that
     button is its whole contents — label, act text and the words on it — so an
     anchored match on the last part never matches anything. */
  const commit = page.getByRole('button', { name: /the hard one/i }).first();
  await commit.waitFor({ state: 'visible', timeout: 20000 });
  check('the acts are offered once a target exists', true);
  await commit.click();
  await page.waitForTimeout(4000);
  check('committing writes the first act of the cycle',
    /what actually happened/i.test(await page.locator('body').innerText()));

  /* The card controls live below the acts as quiet text links and only exist
     once an act is committed — the reveal is not allowed to offer a souvenir
     before it has asked for anything. So the card is checked here, after the
     commit, not up on the fresh reveal where it does not yet exist. */
  // ── The card ──────────────────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: /save your card/i }).first().click(),
  ]);
  const path = await download.path();
  const bytes = new Uint8Array(await readFile(path));
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const width = new DataView(bytes.buffer).getUint32(16);
  const height = new DataView(bytes.buffer).getUint32(20);

  check('card downloads as a PNG', isPng);
  check('card is exactly 1080x1350', width === 1080 && height === 1350, `${width}x${height}`);
  check('card is not blank', bytes.length > BLANK_CARD_BYTES * 1.4, `${Math.round(bytes.length / 1024)}KB vs ${Math.round(BLANK_CARD_BYTES / 1024)}KB blank`);

  /* Non-blank only proves the type drew. Decode the card and look at the band
     the mark occupies — x 380..700, y 320..800 for a 480-tall mark held at
     MARK_ASPECT — to prove the mark itself is in there, at the file's own shape
     and inside its box. Node has no PNG decoder, so the page does it. */
  const markRegion = await page.evaluate(async ({ b64, srcUrl }) => {
    const load = (src) => new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => res(i); i.onerror = rej; i.src = src;
    });
    const inkBox = (img, x0, y0, w, h) => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(x0, y0, w, h).data;
      let minX = w, minY = h, maxX = -1, maxY = -1, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 128) continue;                      // not ink
        const px = (i / 4) % w, py = Math.floor((i / 4) / w);
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
        n++;
      }
      return n ? { w: maxX - minX + 1, h: maxY - minY + 1, n, minX, minY, maxX, maxY } : null;
    };

    const card = await load('data:image/png;base64,' + b64);
    const src = await load(srcUrl);
    return {
      inCard: inkBox(card, 380, 320, 320, 480),
      // Anything in the 40px gutters either side means the mark drew too wide.
      leftGutter: inkBox(card, 340, 320, 40, 480),
      rightGutter: inkBox(card, 700, 320, 40, 480),
      inSource: inkBox(src, 0, 0, src.naturalWidth, src.naturalHeight),
      srcSize: [src.naturalWidth, src.naturalHeight],
    };
  }, { b64: Buffer.from(bytes).toString('base64'), srcUrl: new URL(await page.locator('img[src*="/marks/"]').first().getAttribute('src'), page.url()).href });

  check('card contains the mark', !!markRegion.inCard && markRegion.inCard.n > 2000,
    markRegion.inCard ? `${markRegion.inCard.n} ink pixels in the mark box` : 'mark box is empty');
  check('mark does not overflow its box on the card',
    !markRegion.leftGutter && !markRegion.rightGutter,
    markRegion.leftGutter || markRegion.rightGutter ? 'ink found in the gutter' : 'gutters clean');
  if (markRegion.inCard && markRegion.inSource) {
    /* The mark's own ink, scaled from 1080x1620 into a 320x480 box, keeps its
       proportions. If MARK_ASPECT disagrees with the file the ink squashes. */
    const cardRatio = markRegion.inCard.w / markRegion.inCard.h;
    const srcRatio = markRegion.inSource.w / markRegion.inSource.h;
    check('mark is undistorted on the card', Math.abs(cardRatio - srcRatio) < 0.03,
      `card ink ${cardRatio.toFixed(3)} vs source ink ${srcRatio.toFixed(3)} (source ${markRegion.srcSize.join('x')})`);
  }
  if (SHOTS) await writeFile(`${SHOTS}/05-card.png`, bytes);

  await page.goto(`${URL_}/ledger`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  /* The Ledger header sizes the mark off its height rather than its width, so
     it exercises the other branch of ArchetypeMark. Same test: the box the
     component computes has to match the shape of the file inside it. */
  const navMark = await page.locator('img[src*="/marks/"]').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { rendered: r.width / r.height, natural: el.naturalWidth / el.naturalHeight, h: r.height };
  }).catch(() => null);
  check('the Ledger header carries the mark', !!navMark && navMark.h > 8,
    navMark ? `${Math.round(navMark.h)}px tall` : 'not found');
  check('the Ledger header mark keeps the file\'s aspect',
    !!navMark && Math.abs(navMark.rendered - navMark.natural) < 0.02,
    navMark ? `rendered ${navMark.rendered.toFixed(4)} vs file ${navMark.natural.toFixed(4)}` : 'no mark');

  const ledger = await page.locator('body').innerText();
  check('the Ledger shows the cycle above the act', /cycle 1 ·/i.test(ledger));
  check('the boundary persists across a reload unchanged',
    rubricLine ? ledger.includes(rubricLine.replace(/\.$/, '').slice(0, 50)) : false);

  const field = page.locator('input#what-happened, input[id^="what-happened"]').first();
  await field.waitFor({ state: 'visible', timeout: 15000 });
  await field.fill('Sent the paid-pilot offer to three people this morning with the fee in it. One replied already and said no.');
  await page.getByRole('button', { name: /it's done/i }).first().click();
  await page.waitForTimeout(25000);   // filing, then the crossing read

  /* The rubric is generated, so a filing written in advance may not satisfy it
     and the honest answer is UNCLEAR with one question. That is a real path, not
     a failure — answer it and let the verdict land. */
  const asked = page.locator('input[type="text"]:visible').first();
  if (await asked.count()) {
    const q = await page.locator('body').innerText();
    check('an unclear filing is asked about, once', /\?/.test(q));
    await asked.fill('Yes — all three went out this morning, each naming the work and the fee.');
    await page.getByRole('button', { name: /^answer$/i }).click();
    await page.waitForTimeout(25000);
  }

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const closing = await page.locator('body').innerText();
  check('a filing that meets the boundary closes the cycle', /you crossed it/i.test(closing));
  check('the closing record carries what was named', /what you named/i.test(closing));
  check('the crossing is not described as verified',
    /nothing here saw it happen/i.test(closing) && !/verified|confirmed by/i.test(closing));
  check('no score, grade or percentage on the record', !/\b\d+%|score|grade|streak\b/i.test(closing));
  await shot('06-cycle-closed');

} catch (err) {
  check('ran to completion', false, String(err).split('\n')[0].slice(0, 160));
  await shot('99-failure');
} finally {
  /* Cleanup runs whether or not the run passed. It used to sit at the end of
     the happy path, so the first failure after question eight left a real
     account — carrying a real email address — alive in the database with no
     session left anywhere that could delete it. An assertion failing is the
     normal case for a test; it must not be the case that leaks data. */
  if (!KEEP) {
    try {
      /* The live page still holds the session, so it deletes through exactly
         the path a person would use. If that page is unusable — a crash, a
         navigation that never settled — fall back to the copy on disk. */
      let outcome;
      try {
        outcome = await deleteVia(page);
      } catch {
        const prior = JSON.parse(await readFile(STATE, 'utf8'));
        outcome = `${await deleteRecorded(browser, prior)} (via the recorded session)`;
      }
      await forget();
      check('the run deletes its own account', true, outcome);
    } catch (err) {
      /* The record stays on disk on purpose. The next run will find it and
         finish the job, which is the whole reason it is written down. */
      check('the run deletes its own account', false,
        `left for the next run to clear — ${String(err).split('\n')[0].slice(0, 100)}`);
    }
  }
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.error('BROWSER CHECK FAILED');
  process.exit(1);
}
console.log('BROWSER CHECK PASSED');
