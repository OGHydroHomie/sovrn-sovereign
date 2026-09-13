/**
 * The three triggers, on production, against real rows.
 *
 * No fixtures and no admin key. Each scenario makes a real account, walks the
 * real quiz, generates a real blueprint and commits a real act, then shapes the
 * days behind it through PostgREST using that account's own JWT — the same
 * RLS-scoped path the commit flow itself writes on. /api/trial is then asked the
 * question over the network, by the deployed function, reading those rows.
 *
 *   node scripts/verify-trials-live.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import { probe, settles } from './lib/probe.mjs';

const URL_ = process.env.SOVRN_URL ?? 'https://www.sovrn.online';
const EMAIL = process.env.SOVRN_TEST_EMAIL ?? 'elijahpitts@gmail.com';
const SHOTS = process.env.SHOTS ?? null;

const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n')
  .filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const SUPA = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;

let n = 0, bad = 0;
const check = (label, ok, note = '') => {
  n++; if (!ok) bad++;
  console.log(`    ${ok ? '✓' : '✗'} ${label}${note ? `  — ${note}` : ''}`);
};

/** Walk the product to a committed day one. Returns the cycle and entry. */
async function toFirstAct(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('h1').first().click();
  await page.waitForTimeout(2300);
  await page.getByRole('button', { name: /i create my fate/i }).click();

  const answers = ['Checkbot', '1990-04-05', '08:30', 'Detroit, United States',
    'That I am not as good as people think and that they will find out.',
    'To finish the record and tour it in small rooms without apologising for any of it.',
    'I get to ninety percent and then I start over.',
    EMAIL.replace('@', `+lv${Date.now()}@`)];
  const heading = async () =>
    (await page.locator('h2').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

  for (let step = 0; step < answers.length; step++) {
    const before = await heading();
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
      const o = page.locator('[role="option"], li').first();
      if (await o.count()) await o.click().catch(() => {});
    }
    if (step === 7) {
      const c = page.locator('#sv-consent');
      if (await c.count()) await c.check({ force: true });
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
  await page.getByRole('button', { name: /who you are/i }).first().waitFor({ state: 'visible', timeout: 180000 });
  await page.getByText(/what have you been putting off/i).first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('textarea').first().fill('Leave my job and start a business');
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByText(/what does it cost you/i).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('textarea').first().fill(
    'I am forty-one and I keep saying next year. My kids will remember me as someone who talked about it.');
  await page.getByRole('button', { name: /set the target/i }).click();
  const admitted = page.getByRole('button', { name: /that's it/i });
  /* Either the narrowing lands or the page says it didn't. Measured, the
     narrowing is 5–12s on production; 120s here is room, not an expectation. */
  await settles(page, { ok: admitted, bad: page.getByText(/didn.t go through/i), what: 'the narrowing', timeout: 120000 });
  await admitted.click();
  await page.waitForTimeout(2500);
  const oneAct = page.getByRole('button', { name: /one act/i }).first();
  if ((await oneAct.getAttribute('aria-expanded')) !== 'true') await oneAct.click();
  const commit = page.getByRole('button', { name: /the hard one/i }).first();
  /* Opening a cycle is a database insert and a re-read, with no model call in
     it at all — so this was never the slow step it was reported as. When it
     fails it is the same "didn't go through" as the narrowing. */
  await settles(page, { ok: commit, bad: page.getByText(/didn.t go through/i), what: 'opening the cycle', timeout: 45000 });
  await commit.click();
  await page.waitForFunction(() => /what actually happened/i.test(document.body.innerText),
    null, { timeout: 25000, polling: 500 });
}

/** File day one through the real buttons. */
async function fileDayOne(page, done) {
  await page.locator('input:visible, textarea:visible').first()
    .fill(done ? 'Sent it to the first two people on the list.' : 'Did not get to it.');
  await page.getByRole('button', { name: done ? /it.s done/i : /i didn.t do it/i }).first().click();
  await page.waitForTimeout(3000);
}

/** Rows written with the account's own JWT, through PostgREST, under RLS. */
async function shape(page, days) {
  return page.evaluate(async ({ supa, anon, days }) => {
    const auth = JSON.parse(localStorage.getItem('sovrn_auth'));
    const token = auth.access_token, uid = auth.user.id;
    const get = async (path) => (await fetch(`${supa}/rest/v1/${path}`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    })).json();

    const cycles = await get(`cycles?user_id=eq.${uid}&closed_at=is.null&select=id,rubric,requires_contact`);
    const existing = await get(`ledger_entries?user_id=eq.${uid}&select=day_number&order=day_number.asc`);
    const cycle = cycles[0];
    let next = (existing.at(-1)?.day_number ?? 0) + 1;

    const made = [];
    for (const kind of days) {
      const at = new Date(Date.now() - (days.length - made.length) * 3600e3).toISOString();
      const row = {
        user_id: uid, cycle_id: cycle.id, day_number: next++,
        mission_text: 'Send the offer to the next named person.',
        committed_at: at,
        filed_at: kind === 'miss' || kind === 'done' ? at : null,
        completed_at: kind === 'done' ? at : null,
        /* `filing_requires_text` — a completed day has to say what happened.
           A real constraint the real table enforces, and the fixture did not
           know about it until production refused the row. */
        what_happened: kind === 'done' ? 'Sent it to the next person on the list.'
          : kind === 'miss' ? 'Did not get to it.' : null,
      };
      const res = await fetch(`${supa}/rest/v1/ledger_entries`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: `Bearer ${token}`,
                   'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      const body = await res.json();
      made.push({ kind, status: res.status, id: body?.[0]?.id ?? null, error: body?.message ?? null });
    }
    return { uid, cycle, made, token };
  }, { supa: SUPA, anon: ANON, days });
}

/** Ask the deployed function, over the network. */
async function askProduction(page, url, token) {
  const res = await page.request.post(`${url}/api/trial`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { action: 'state' },
  });
  return { status: res.status(), body: await res.json() };
}

async function scenario(title, days, fileDone, expect, ceremony = false) {
  console.log(`\n  ${title}`);
  /* --keep leaves the account alive so the row the endpoint wrote can be read
     back out of the database afterwards. It has to be deleted by hand. */
  const keep = process.argv.includes('--keep');
  await probe({ url: URL_, name: `live-${expect}`, keep }, async ({ page, url }) => {
    await toFirstAct(page, url);
    await fileDayOne(page, fileDone);
    const shaped = await shape(page, days);
    const written = shaped.made.every((m) => m.status === 201 && m.id);
    check('real rows written under the account\'s own credentials', written,
      shaped.made.map((m) => `${m.kind}:${m.status}${m.error ? ` ${m.error}` : ''}`).join(' '));
    if (!written) return;

    const { status, body } = await askProduction(page, url, shaped.token);
    check('the deployed function answers', status === 200, `HTTP ${status}`);
    check(`it is the ${expect}`, body.trial?.figure === expect,
      body.trial ? `${body.trial.figure} · encounter ${body.trial.encounter}` : 'no trial');
    if (body.trial) console.log(`        "${body.trial.reason}"`);

    /* And the ceremony, on the deployed bundle, over the deployed Ledger. The
       question above was asked over the wire and consumed the `fresh` flag by
       stamping the row — so this reload is deliberately a second sight, and the
       ceremony it runs is the recurrence. Which is itself the assertion worth
       making here: an arrival is not replayed by a reload. */
    if (ceremony) {
      await page.goto(`${url}/ledger`, { waitUntil: 'networkidle' });
      await page.locator('[data-trial]').first().waitFor({ timeout: 30000 }).catch(() => {});
      const seen = await page.evaluate(() => {
        const c = document.querySelector('[data-trial]');
        const a = document.querySelector('[data-trial-arrival]');
        return { card: Boolean(c), figure: c?.dataset.trial ?? null, replaying: Boolean(a) };
      });
      check('the card is on the deployed Ledger', seen.card && seen.figure === expect,
        `data-trial="${seen.figure}"`);
      check('and a reload does not replay the arrival', !seen.replaying,
        seen.replaying ? 'the ceremony ran again' : 'the stamp held');
      if (SHOTS) {
        await mkdir(SHOTS, { recursive: true });
        await page.screenshot({ path: `${SHOTS}/live-${expect}.png`, fullPage: true });
      }
    }
    console.log(`        cycle ${shaped.cycle.id}`);
    console.log(`        rubric: ${shaped.cycle.rubric}`);
    console.log(`        requires_contact was ${JSON.stringify(shaped.cycle.requires_contact)} before the call`);
    if (keep) {
      const after = await page.evaluate(async ({ supa, anon, id }) => {
        const auth = JSON.parse(localStorage.getItem('sovrn_auth'));
        const r = await fetch(`${supa}/rest/v1/cycles?id=eq.${id}&select=requires_contact`, {
          headers: { apikey: anon, Authorization: `Bearer ${auth.access_token}` } });
        return (await r.json())[0];
      }, { supa: SUPA, anon: ANON, id: shaped.cycle.id });
      console.log(`        requires_contact is ${JSON.stringify(after?.requires_contact)} after it`);
      console.log(`        uid ${shaped.uid}  — kept; delete it`);
    }
  });
}

const only = process.argv[2];
const pick = (figure) => !only || only === figure;

/* The Devil: committed and didn't, twice. */
if (pick('devil')) await scenario('THE DEVIL — against real rows on production', ['miss', 'open'], false, 'devil', true);
/* The Hermit: two mornings unanswered, and a return. */
if (pick('hermit')) await scenario('THE HERMIT — against real rows on production', ['silent', 'silent', 'open'], true, 'hermit');
/* The Sun: two finished acts, boundary untouched, requires_contact unset — so
   the endpoint has to ask the model what the boundary needs. */
if (pick('sun')) await scenario('THE SUN — and the model call that has never run', ['done', 'open'], true, 'sun');

console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
