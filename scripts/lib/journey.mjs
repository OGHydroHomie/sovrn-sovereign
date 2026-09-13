/**
 * The walk from the front door to a committed act.
 *
 * Three harnesses had their own copy of this and they had drifted: one typed an
 * ISO date into a two-digit day box, one paced its clicks on a stopwatch the
 * climb ignores, one waited on a control that a failed step never renders. Every
 * one of those was found separately, in a different file, weeks apart.
 *
 * It lives here now. A step that changes shape changes in one place.
 */
import { settles } from './probe.mjs';

const FAILED = /didn.t go through/i;

/** Walk the quiz. Leaves the page on the reveal, generated. */
export async function toReveal(page, url, { email }) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('h1').first().click();
  await page.waitForTimeout(2300);
  await page.getByRole('button', { name: /i create my fate/i }).click();

  const answers = ['Checkbot', '1990-04-05', '08:30', 'Detroit, United States',
    'That I am not as good as people think and that they will find out.',
    'To finish the record and tour it in small rooms without apologising for any of it.',
    'I get to ninety percent and then I start over.',
    email];

  const heading = async () =>
    (await page.locator('h2').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

  for (let step = 0; step < answers.length; step++) {
    const before = await heading();

    /* The date and the time are several fields each — the native pickers could
       not be made dark, so they are plain numeric parts. */
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

    if (step === 3) {                       // the city autocomplete
      await page.waitForTimeout(1200);
      const option = page.locator('[role="option"], li').first();
      if (await option.count()) await option.click().catch(() => {});
    }
    if (step === 7) {                       // consent
      const consent = page.locator('#sv-consent');
      if (await consent.count()) await consent.check({ force: true });
    }

    await page.getByRole('button', { name: /continue|reveal|blueprint|next/i }).first().click();

    /* Wait for the question to change rather than for a number of milliseconds.
       The last four questions are a climb, and a climb refuses a second advance
       until it settles — a harness pacing at 500ms had its clicks silently
       ignored and never reached question eight at all. */
    if (step < answers.length - 1) {
      await page.waitForFunction((was) => {
        const h = document.querySelector('h2');
        const now = (h?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return now !== '' && now !== was;
      }, before, { timeout: 30000, polling: 'raf' });
      await page.waitForTimeout(450);
    }
  }

  await page.getByRole('button', { name: /who you are/i }).first()
    .waitFor({ state: 'visible', timeout: 180000 });
}

/** Name a target, accept the narrowing, open the cycle, commit the first act. */
export async function toFirstAct(page, url, { email }) {
  await toReveal(page, url, { email });

  await page.getByText(/what have you been putting off/i).first()
    .waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('textarea').first().fill('Leave my job and start a business');
  await page.getByRole('button', { name: /^next$/i }).click();

  await page.getByText(/what does it cost you/i).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('textarea').first().fill(
    'I am forty-one and I keep saying next year. My kids will remember me as someone who talked about it.');
  await page.getByRole('button', { name: /set the target/i }).click();

  /* Either the narrowing lands or the page says it didn't. Measured on
     production the narrowing is 5-12s — three model calls, two of them
     genuinely dependent — so this is room, not an expectation. */
  const admitted = page.getByRole('button', { name: /that's it/i });
  await settles(page, { ok: admitted, bad: page.getByText(FAILED), what: 'the narrowing', timeout: 120000 });
  await admitted.click();
  await page.waitForTimeout(2500);

  const oneAct = page.getByRole('button', { name: /one act/i }).first();
  if ((await oneAct.getAttribute('aria-expanded')) !== 'true') await oneAct.click();

  /* Opening a cycle is an insert and a re-read — there is no model call in it,
     and the acts were generated with the blueprint minutes ago. */
  const commit = page.getByRole('button', { name: /the hard one/i }).first();
  await settles(page, { ok: commit, bad: page.getByText(FAILED), what: 'opening the cycle', timeout: 45000 });
  await commit.click();

  await page.waitForFunction(() => /what actually happened/i.test(document.body.innerText),
    null, { timeout: 25000, polling: 500 });
}

/**
 * A record, written by the account itself.
 *
 * The same RLS-scoped path the product writes on, and no generator anywhere in
 * it. For anything downstream of the first act — a trial, its arrival, its
 * unbinding — walking the quiz puts three model calls in front of a thing that
 * does not use them, and every transient failure worth having a harness for has
 * landed in exactly those three.
 *
 * `days` is a list of 'miss' | 'done' | 'silent' | 'open', earliest first.
 */
export async function seedRecord(page, url, { supa, anon, days = ['miss', 'miss', 'open'] }) {
  await page.goto(url, { waitUntil: 'networkidle' });
  return page.evaluate(async ({ supa, anon, days }) => {
    const auth = JSON.parse(localStorage.getItem('sovrn_auth') ?? 'null');
    if (!auth?.access_token) return { error: 'no session in this browser yet' };
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
      target_stated: 'Leave my job and start a business',
      target_admitted: 'Write a one-page paid offer and send it to three people who could hire you.',
      rubric: 'Crossed when the one-page offer, with a price on it, has been sent to three named people.',
      cost: 'I keep saying next year.',
      closes_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    });
    if (cyc.status >= 300) return { error: `cycles ${cyc.status} ${JSON.stringify(cyc.body).slice(0, 140)}` };

    const made = [];
    for (const [i, kind] of days.entries()) {
      const at = new Date(Date.now() - (days.length - i) * 864e5 + i * 36e5).toISOString();
      /* `filing_requires_text`: a completed day has to say what happened. */
      const r = await post('ledger_entries', {
        user_id: uid, cycle_id: cyc.body[0].id, day_number: i + 1,
        mission_text: 'Send the offer to the next named person.',
        committed_at: at,
        filed_at: kind === 'miss' || kind === 'done' ? at : null,
        completed_at: kind === 'done' ? at : null,
        what_happened: kind === 'done' ? 'Sent it without reading it again.'
          : kind === 'miss' ? 'Did not get to it.' : null,
      });
      if (r.status >= 300) return { error: `ledger_entries ${r.status} ${JSON.stringify(r.body).slice(0, 140)}` };
      made.push(`${kind}:${r.status}`);
    }
    return { uid, cycleId: cyc.body[0].id, made: made.join(' ') };
  }, { supa, anon, days });
}
