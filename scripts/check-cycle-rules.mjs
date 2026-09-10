#!/usr/bin/env node
/**
 * The two cycle rules a browser cannot reach.
 *
 * Rubric immutability and thirty-day expiry are enforced in Postgres, and a
 * browser has no way to attempt an illegal update or to make a month pass. This
 * probes both directly and prints what happened.
 *
 * Needs a connection string:  DATABASE_URL=... node scripts/check-cycle-rules.mjs
 * Without one it prints the SQL to run by hand, rather than pretending to pass.
 */
const SQL = `
create temp table probe(rule text, outcome text);
do $$
declare uid uuid; c uuid;
begin
  select id into uid from public.users limit 1;

  insert into public.cycles (user_id, closes_at, target_stated, target_admitted, rubric, cost)
  values (uid, now() + interval '30 days', 'stated', 'admitted',
          'Crossed when the offer is sent to three people.', 'cost')
  returning id into c;

  begin
    update public.cycles set rubric = 'Crossed when you feel ready.' where id = c;
    insert into probe values ('rubric cannot be rewritten', 'ALLOWED  <- BUG');
  exception when others then insert into probe values ('rubric cannot be rewritten', 'REJECTED <- correct'); end;

  begin
    update public.cycles set target_admitted = 'something easier' where id = c;
    insert into probe values ('admitted target cannot be rewritten', 'ALLOWED  <- BUG');
  exception when others then insert into probe values ('admitted target cannot be rewritten', 'REJECTED <- correct'); end;

  begin
    insert into public.cycles (user_id, closes_at, target_stated, target_admitted, rubric, cost)
    values (uid, now() + interval '30 days', 'x', 'x', 'x', 'x');
    insert into probe values ('only one cycle open at a time', 'ALLOWED  <- BUG');
  exception when unique_violation then insert into probe values ('only one cycle open at a time', 'REJECTED <- correct'); end;

  -- Expiry: age it past its close and run what the 6am job runs.
  update public.cycles set closes_at = now() - interval '1 day' where id = c;
  update public.cycles set closed_at = now(), close_reason = 'expired'
    where id = c and closed_at is null and closes_at < now();
  insert into probe
    select 'a cycle past thirty days expires',
           case when close_reason = 'expired' and closed_at is not null
                then 'CLOSED as expired <- correct' else 'STILL OPEN <- BUG' end
    from public.cycles where id = c;

  -- And a closed one frees the slot.
  begin
    insert into public.cycles (user_id, closes_at, target_stated, target_admitted, rubric, cost, cycle_number)
    values (uid, now() + interval '30 days', 'y', 'y', 'y', 'y', 2);
    insert into probe values ('a new cycle may open once one closes', 'ALLOWED  <- correct');
  exception when unique_violation then insert into probe values ('a new cycle may open once one closes', 'REJECTED <- BUG'); end;

  delete from public.cycles where user_id = uid;
end $$;
select * from probe;
`;

if (!process.env.DATABASE_URL) {
  console.log('check-cycle-rules: no DATABASE_URL set.\n');
  console.log('These two rules live in Postgres and no browser can reach them.');
  console.log('Run this against the database:\n');
  console.log(SQL);
  process.exit(0);
}
const { default: pg } = await import('pg');
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const r = await c.query(SQL);
const rows = (Array.isArray(r) ? r[r.length - 1] : r).rows ?? [];
for (const row of rows) console.log(`  ${row.outcome.padEnd(30)} ${row.rule}`);
await c.end();
process.exit(rows.some((x) => x.outcome.includes('BUG')) ? 1 : 0);
