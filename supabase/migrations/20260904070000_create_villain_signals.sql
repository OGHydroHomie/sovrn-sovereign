-- Demand data for a mode that does not exist. One row per person who asked for
-- it, so the count answers "how many people want this" rather than "how many
-- times did the button get pressed" — a unique index on user_id, because a
-- table anyone can insert into repeatedly measures enthusiasm for tapping.
create table if not exists public.villain_signals (
  id uuid primary key default gen_random_uuid(),
  -- References public.users, not auth.users, matching ledger_entries. The chain
  -- auth.users -> users -> villain_signals is CASCADE the whole way, so
  -- /api/delete removes the signal with everything else and needs no change.
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists villain_signals_user_once
  on public.villain_signals (user_id);

alter table public.villain_signals enable row level security;

-- Insert-own only, and deliberately no select policy: like `emails`, this table
-- is write-only from the browser. Nothing can read the list of who signalled
-- back through the API.
drop policy if exists villain_signals_insert_own on public.villain_signals;
create policy villain_signals_insert_own
  on public.villain_signals for insert
  to anon, authenticated
  with check (user_id = auth.uid());
