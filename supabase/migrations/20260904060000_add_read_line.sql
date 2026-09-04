-- The read line — the one sentence naming what yesterday actually was — has
-- until now existed only inside the morning email. It is generated per day, out
-- of that day's evidence, so it belongs to the entry rather than to the person.
--
-- Null for day one (there is nothing yet to read) and null for every entry
-- written before this column existed.
alter table public.ledger_entries add column if not exists read_line text;

comment on column public.ledger_entries.read_line is
  'One sentence naming what the previous day actually was. Written at generation time by /api/day2. Null on day one and on any entry that predates the column.';
