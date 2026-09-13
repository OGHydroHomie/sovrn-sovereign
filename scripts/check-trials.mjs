/**
 * The trials, without a browser.
 *
 * Two suites against the real modules, bundled the way the deployment builds
 * them: the triggers in api/_trials.ts called directly, and api/trial.ts driven
 * through the real supabase-js client against an in-memory PostgREST. The third
 * suite — the card wrapping a real day — is scripts/probe-trials.mjs.
 *
 *   node scripts/check-trials.mjs
 */
import { bundled, SERVERLESS } from './lib/bundle.mjs';
import { fakeDb } from './lib/fake-postgrest.mjs';

const { detectTrial, advanceTrial } = await bundled('api/_trials.ts');
const { default: handler } = await bundled('api/trial.ts', { external: SERVERLESS });

let n = 0, bad = 0;
const is = (label, got, want) => {
  n++; const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`    ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${ok ? '' : `  expected ${JSON.stringify(want)}`}`);
};


const UID = '11111111-1111-4111-8111-111111111111';
const CYCLE = 'cycle-one';
const T = (d, h) => new Date(Date.UTC(2026, 8, d, h, 4)).toISOString();

/* A day. `open` = committed and not yet answered; `miss` = answered with no;
   `done` = crossed; `silent` = the morning came and nothing was said to it. */
const day = (n, kind) => ({
  id: `entry-${n}`, user_id: UID, day_number: n, cycle_id: CYCLE,
  committed_at: T(n, 5 + n),
  filed_at: kind === 'miss' || kind === 'done' ? T(n, 21) : null,
  completed_at: kind === 'done' ? T(n, 21) : null,
  trial_id: null, trial_encounter: null,
});

/* Filing an act updates the day it belongs to. Replacing the row instead would
   discard the trial stamp the previous call wrote onto it — and then prove it
   was never written. */
const file = (w, n, kind) => Object.assign(w.rows.find((e) => e.day_number === n), {
  filed_at: T(n, 21), completed_at: kind === 'done' ? T(n, 21) : null,
});


/* ── The triggers ─────────────────────────────────────────────────────────
   A day: committed, then either filed done, filed undone, or never answered. */
const TT = (h, m) => new Date(Date.UTC(2026, 8, 10, h, m)).toISOString();
const fixture = (d, kind, cycle = 'c1') => ({
  id: `e${d}`, day_number: d, committed_at: TT(6, d),
  completed_at: kind === 'done' ? TT(16, d) : null,
  filed_at: kind === 'done' || kind === 'miss' ? TT(16, d) : null,
  cycle_id: cycle,
});

const plain = { requiresContact: null, crossed: false };

console.log('\n  THE DEVIL — committed and didn\'t, twice, on one target');
is('two filed misses in the cycle', detectTrial([fixture(1, 'miss'), fixture(2, 'miss')], 'c1', 'UTC', plain)?.figure, 'devil');
is('one miss is not a binding', detectTrial([fixture(1, 'miss'), fixture(2, 'done')], 'c1', 'UTC', plain)?.figure, undefined);
is('misses on two different targets', detectTrial([fixture(1, 'miss', 'c1'), fixture(2, 'miss', 'c2')], 'c1', 'UTC', plain)?.figure, undefined);
is('unanswered days are not misses', detectTrial([fixture(1, 'silent'), fixture(2, 'silent'), fixture(3, 'done')], 'c1', 'UTC', plain)?.figure, 'hermit');
console.log(`      reason: ${JSON.stringify(detectTrial([fixture(1, 'miss'), fixture(2, 'miss')], 'c1', 'America/Chicago', plain)?.reason)}`);

console.log('\n  THE HERMIT — a return, never the leaving');
is('two silent days then a return', detectTrial([fixture(1, 'silent'), fixture(2, 'silent'), fixture(3, 'done')], 'c1', 'UTC', plain)?.figure, 'hermit');
is('three silent days then a return', detectTrial([fixture(1, 'silent'), fixture(2, 'silent'), fixture(3, 'silent'), fixture(4, 'miss')], 'c1', 'UTC', plain)?.figure, 'hermit');
is('STILL AWAY — trailing silence unlocks nothing', detectTrial([fixture(1, 'done'), fixture(2, 'silent'), fixture(3, 'silent')], 'c1', 'UTC', plain)?.figure, undefined);
is('one silent day is not a withdrawal', detectTrial([fixture(1, 'silent'), fixture(2, 'done')], 'c1', 'UTC', plain)?.figure, undefined);
console.log(`      reason: ${JSON.stringify(detectTrial([fixture(1, 'silent'), fixture(2, 'silent'), fixture(3, 'done')], 'c1', 'UTC', plain)?.reason)}`);

console.log('\n  THE SUN — finished acts, boundary still needing the world');
const needsWorld = { requiresContact: true, crossed: false };
is('two completions while the boundary needs the world', detectTrial([fixture(1, 'done'), fixture(2, 'done')], 'c1', 'UTC', needsWorld)?.figure, 'sun');
is('boundary crossable alone', detectTrial([fixture(1, 'done'), fixture(2, 'done')], 'c1', 'UTC', { requiresContact: false, crossed: false })?.figure, undefined);
is('not yet known', detectTrial([fixture(1, 'done'), fixture(2, 'done')], 'c1', 'UTC', { requiresContact: null, crossed: false })?.figure, undefined);
is('already crossed', detectTrial([fixture(1, 'done'), fixture(2, 'done')], 'c1', 'UTC', { requiresContact: true, crossed: true })?.figure, undefined);
console.log(`      reason: ${JSON.stringify(detectTrial([fixture(1, 'done'), fixture(2, 'done')], 'c1', 'UTC', needsWorld)?.reason)}`);

console.log('\n  THE THREE-ENCOUNTER RULE');
const entries = [fixture(1, 'miss'), fixture(2, 'miss'), fixture(3, 'silent'), fixture(4, 'silent')];
is('same day — nothing moves', advanceTrial({ encounter: 1, last_day: 3 }, entries, fixture(3, 'silent')).kind, 'hold');
is('new day, the last one uncrossed — it returns', advanceTrial({ encounter: 1, last_day: 3 }, entries, fixture(4, 'silent')).kind, 'returns');
is('  at the second encounter', advanceTrial({ encounter: 1, last_day: 3 }, entries, fixture(4, 'silent')).encounter, 2);
is('  then the third', advanceTrial({ encounter: 2, last_day: 3 }, entries, fixture(4, 'silent')).encounter, 3);
is('  and never a fourth', advanceTrial({ encounter: 3, last_day: 3 }, entries, fixture(4, 'silent')).encounter, 3);
const crossedAt2 = [fixture(1, 'miss'), fixture(2, 'done'), fixture(3, 'silent')];
is('crossing at any encounter frees it', advanceTrial({ encounter: 2, last_day: 2 }, crossedAt2, fixture(3, 'silent')).kind, 'freed');
is('  and names the act that earned it', advanceTrial({ encounter: 2, last_day: 2 }, crossedAt2, fixture(3, 'silent')).entryId, 'e2');
is('no day at all — nothing moves', advanceTrial({ encounter: 1, last_day: 1 }, entries, null).kind, 'hold');

console.log('\n  NO TRIAL — most days');
is('a clean record supports nothing', detectTrial([fixture(1, 'done'), fixture(2, 'done')], 'c1', 'UTC', plain)?.figure, undefined);
is('an empty record supports nothing', detectTrial([], 'c1', 'UTC', plain)?.figure, undefined);


/* ── The endpoint ────────────────────────────────────────────────────────── */

async function world(entries, cycle = {}) {
  const store = fakeDb({
    ledger_entries: entries,
    cycles: [{ id: CYCLE, user_id: UID, rubric: 'Crossed when the resignation letter is sent.',
               closed_at: null, opened_at: T(1, 0), crossed_at: null, requires_contact: null, ...cycle }],
    users: [{ id: UID, timezone: 'Europe/London' }],
    trials: [],
  }, { trials: ['user_id','cycle_id','figure','state','encounter','reason','quest','last_day','freed_at','freed_by_entry'] });
  const url = await store.listen();
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = 'service-role-fixture';
  delete process.env.ANTHROPIC_API_KEY;   // no model call on these paths

  const call = async (action = 'state', token = UID) => {
    let code = 0, body = null;
    const res = { status(c) { code = c; return this; }, json(b) { body = b; return this; } };
    await handler({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { action } }, res);
    return { code, ...body };
  };
  /* The handler reads the database, so a test that wants a new day has to put
     one in the database — not in the array the fixture was built from. */
  const rows = store.db.ledger_entries;
  return { call, store, rows, done: () => store.close() };
}

console.log('\n  ARRIVAL — the Devil, on a record that supports it');
{
  const w = await world([day(1, 'miss'), day(2, 'miss'), day(3, 'open')]);
  const first = await w.call();
  is('the trial arrives', [first.code, first.trial?.figure], [200, 'devil']);
  is('at the first encounter', first.trial?.encounter, 1);
  is('and knows it is the first sight of it', first.trial?.first, true);
  is('no quest yet', first.trial?.quest, null);
  console.log(`      "${first.trial?.reason}"`);
  is('a row exists, active', w.store.db.trials.map((t) => [t.figure, t.state, t.encounter]), [['devil', 'active', 1]]);
  is('the day it wraps is stamped', w.store.db.ledger_entries.at(-1).trial_encounter, 1);

  const again = await w.call();
  is('opening the page twice does not advance it', again.trial?.encounter, 1);
  is('and it is no longer the first sight', again.trial?.first, false);
  is('still exactly one trial', w.store.db.trials.length, 1);
  await w.done();
}

console.log('\n  RECURRENCE — three encounters and never a fourth');
{
  const entries = [day(1, 'miss'), day(2, 'miss'), day(3, 'open')];
  const w = await world(entries);
  await w.call();

  file(w, 3, 'miss'); w.rows.push(day(4, 'open'));
  const second = await w.call();
  is('a new day with the last one uncrossed', second.trial?.encounter, 2);
  is('no quest at the second', second.trial?.quest, null);

  file(w, 4, 'miss'); w.rows.push(day(5, 'open'));
  const third = await w.call();
  is('and a third', third.trial?.encounter, 3);
  is('the third opens a quest', typeof third.trial?.quest, 'string');
  console.log(`      "${third.trial?.quest}"`);

  file(w, 5, 'miss'); w.rows.push(day(6, 'open'));
  const fourth = await w.call();
  is('there is no fourth encounter', fourth.trial?.encounter, 3);
  is('the quest stays open', typeof fourth.trial?.quest, 'string');
  is('every encounter is stamped on its own day',
    w.store.db.ledger_entries.map((e) => e.trial_encounter), [null, null, 1, 2, 3, 3]);
  await w.done();
}

console.log('\n  FREEING — crossing ends it, at any encounter');
{
  const entries = [day(1, 'miss'), day(2, 'miss'), day(3, 'open')];
  const w = await world(entries);
  await w.call();
  file(w, 3, 'done'); w.rows.push(day(4, 'open'));
  const after = await w.call();
  is('the trial is gone', after.trial, null);
  is('and says which figure was freed', after.freed?.figure, 'devil');
  is('the row records it', w.store.db.trials.map((t) => [t.state, t.freed_by_entry]), [['freed', 'entry-3']]);
  const next = await w.call();
  is('a freed figure does not return inside the cycle', next.trial, null);
  await w.done();
}

console.log('\n  THIS ISN\'T IT — a rejection is a route change, not a record');
{
  const entries = [day(1, 'miss'), day(2, 'miss'), day(3, 'open')];
  const w = await world(entries);
  await w.call();
  const rejected = await w.call('reject');
  is('nothing comes back', rejected.trial, null);
  is('the row is marked and nothing else is', w.store.db.trials.map((t) => t.state), ['rejected']);
  is('no count, no reason, no flag',
    Object.keys(w.store.db.trials[0]).filter((k) => /reject|resist|declin|\bcount\b|attempts/i.test(k)), []);
  w.rows.push(day(4, 'open'));
  const later = await w.call();
  is('and it does not come back inside this cycle', later.trial, null);
  await w.done();
}

console.log('\n  THE OTHER TWO, on their own histories');
{
  const w = await world([day(1, 'silent'), day(2, 'silent'), day(3, 'open')]);
  const r = await w.call();
  is('the Hermit needs the return', r.trial?.figure, 'hermit');
  console.log(`      "${r.trial?.reason}"`);
  await w.done();
}
{
  const w = await world([day(1, 'done'), day(2, 'done'), day(3, 'open')], { requires_contact: true });
  const r = await w.call();
  is('the Sun, when the boundary needs the world', r.trial?.figure, 'sun');
  console.log(`      "${r.trial?.reason}"`);
  await w.done();
}
{
  const w = await world([day(1, 'done'), day(2, 'done'), day(3, 'open')], { requires_contact: false });
  is('and not when it does not', (await w.call()).trial, null);
  await w.done();
}

console.log('\n  THE ORDINARY DAY, and the closed door');
{
  const w = await world([day(1, 'done'), day(2, 'open')]);
  is('a clean record gets no trial', (await w.call()).trial, null);
  is('no row is written for nothing', w.store.db.trials.length, 0);
  is('no session at all', (await w.call('state', '')).code, 401);
  is('a session that is not one', (await w.call('state', 'bad')).code, 401);
  await w.done();
}


console.log(`\n  ${n - bad}/${n}\n`);
process.exit(bad ? 1 : 0);
