-- Split commitment from completion.
--
-- An entry is created when someone commits to an act ("I COMMIT"). Completing it
-- ("IT'S DONE", with what actually happened) is a separate, later event. The
-- Ledger shows both times, and an entry that was committed but never completed
-- stays open on the record rather than disappearing.
--
-- The two existing Postgres rules are unchanged and still do the enforcing:
--   ledger_complete_once      — updatable only while completed_at IS NULL
--   completion_requires_text  — completion requires non-empty what_happened

alter table public.ledger_entries add column committed_at timestamptz;

-- Backfill. Under the previous flow the row was created the moment the act was
-- chosen, so created_at IS the commit time for existing entries. Deliberately
-- not now(): that would overwrite a real person's commit time with the time the
-- migration happened to run.
update public.ledger_entries set committed_at = created_at where committed_at is null;

alter table public.ledger_entries alter column committed_at set not null;
alter table public.ledger_entries alter column committed_at set default now();
