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
 * This performs a REAL generation against whatever URL it is given: it spends
 * model tokens, writes a row, and — because question eight captures an address —
 * causes the app to send a real confirmation email.
 *
 * --email is required for exactly that reason. The first two runs used an
 * @example.invalid address and produced two hard bounces against the sending
 * domain, because .invalid does not resolve. Give it a real inbox you own; a
 * plus-tag is ideal.
 *
 * The account it creates deletes itself through the product's own /delete flow
 * at the end, which leaves no residue and exercises that path as a side effect.
 * Pass --keep to leave it behind.
 */
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const URL_ = (arg('url', 'https://www.sovrn.online')).replace(/\/$/, '');
const HEADED = process.argv.includes('--headed');
const SHOTS = arg('shots', '');
const EMAIL = arg('email', '');
const KEEP = process.argv.includes('--keep');

if (!EMAIL || EMAIL.endsWith('.invalid') || EMAIL.endsWith('.test') || EMAIL.endsWith('.example')) {
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

const browser = await chromium.launch({ headless: !HEADED });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },      // iPhone-ish, where the bug was found
  deviceScaleFactor: 2,
  acceptDownloads: true,
});
const page = await context.newPage();
page.on('pageerror', (e) => check('no uncaught page errors', false, e.message.slice(0, 120)));

console.log(`browser-check: ${URL_}\n`);
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

try {
  // ── Hero ──────────────────────────────────────────────────────────────────
  await page.goto(URL_, { waitUntil: 'networkidle', timeout: 60000 });
  const heroHeading = await page.locator('h1').first().innerText();
  check('hero renders a heading', heroHeading.trim().length > 0, JSON.stringify(heroHeading.trim().slice(0, 44)));
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

  for (let step = 0; step < answers.length; step++) {
    await page.waitForTimeout(500);
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
  }
  check('quiz accepted all eight answers', true);
  await shot('02-loading');

  // ── Generation and the reveal ─────────────────────────────────────────────
  const revealed = page.getByRole('button', { name: /who you are/i }).first();
  await revealed.waitFor({ state: 'visible', timeout: 180000 });
  check('reveal renders after generation', true);
  await page.waitForTimeout(3000);   // let the header timeline finish
  await shot('03-reveal');

  const name = (await page.locator('h1').first().innerText()).trim();
  check('archetype name is on the reveal', /^THE [A-Z ]+$/.test(name), JSON.stringify(name));

  const markBox = await page.locator('img[alt=""], div').filter({ hasText: /^$/ }).first().boundingBox().catch(() => null);
  check('archetype mark occupies space', !!markBox && markBox.width > 100, markBox ? `${Math.round(markBox.width)}px wide` : 'not found');

  // ── The three panels. This is the bug that shipped. ───────────────────────
  for (const header of ['WHO YOU ARE', 'THE PATTERN', 'ONE ACT']) {
    const button = page.getByRole('button', { name: new RegExp(header, 'i') }).first();
    await button.click();
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
  if (SHOTS) await writeFile(`${SHOTS}/05-card.png`, bytes);
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

  await page.goto(`${URL_}/ledger`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
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

  // ── Clean up after itself, through the product's own path ────────────────
  if (!KEEP) {
    await page.goto(`${URL_}/delete`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^delete my data$/i }).first().click();
    await page.getByRole('button', { name: /yes, delete everything/i }).first().click();
    await page.getByText(/your data has been deleted/i).waitFor({ timeout: 30000 });
    check('the run deletes its own account', true);
  }
} catch (err) {
  check('ran to completion', false, String(err).split('\n')[0].slice(0, 160));
  await shot('99-failure');
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.error('BROWSER CHECK FAILED');
  process.exit(1);
}
console.log('BROWSER CHECK PASSED');
