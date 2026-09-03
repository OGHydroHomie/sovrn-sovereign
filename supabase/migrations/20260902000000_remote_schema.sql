-- Remote schema for the `sovrn` project (ref ptoeeupkjsmnggxfzlrw), captured so the
-- shape the app codes against is version-controlled alongside it.
--
-- This file is a record of what production already is. The tables, policies, and
-- constraints below were created ahead of this commit and are NOT applied by it.
-- Two rules here are enforced by Postgres and are load-bearing for the app:
--   * ledger_complete_once      — a ledger row is updatable only while completed_at IS NULL
--   * completion_requires_text  — completing requires non-empty what_happened
-- Build with them, not around them.

-- ── users ────────────────────────────────────────────────────────────────────
-- users.id IS auth.uid(). Anonymous auth is the identity.
create table if not exists public.users (
  id            uuid        not null primary key references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  email         text,
  archetype     text,
  blueprint_json jsonb,
  consent_at    timestamptz
);

alter table public.users enable row level security;

create policy users_select_own on public.users
  for select to authenticated
  using (id = auth.uid());

create policy users_insert_own on public.users
  for insert to authenticated
  with check (id = auth.uid());

create policy users_update_own on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy: a user row is not removable through the API.

-- ── ledger_entries ───────────────────────────────────────────────────────────
create table if not exists public.ledger_entries (
  id            uuid        not null default gen_random_uuid() primary key,
  user_id       uuid        not null references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  day_number    integer     not null,
  mission_text  text        not null,
  completed_at  timestamptz,
  what_happened text,
  -- Completion is all-or-nothing: an entry is either open with no account of what
  -- happened, or completed with a non-empty one. There is no third state.
  constraint completion_requires_text check (
    (completed_at is null and what_happened is null)
    or (completed_at is not null and length(btrim(what_happened)) > 0)
  )
);

-- One mission per user per day.
create unique index if not exists ledger_entries_one_per_day
  on public.ledger_entries using btree (user_id, day_number);

alter table public.ledger_entries enable row level security;

create policy ledger_select_own on public.ledger_entries
  for select to authenticated
  using (user_id = auth.uid());

create policy ledger_insert_own on public.ledger_entries
  for insert to authenticated
  with check (user_id = auth.uid());

-- Completed once, never editable after. The USING clause stops matching the moment
-- completed_at is set, so a second update finds no row to touch.
create policy ledger_complete_once on public.ledger_entries
  for update to authenticated
  using (user_id = auth.uid() and completed_at is null)
  with check (user_id = auth.uid());

-- No delete policy: entries are not individually deletable.

-- ── emails ───────────────────────────────────────────────────────────────────
-- Write-only capture surface. Insert is open to anon and authenticated so a lead is
-- recorded even before sign-in settles; there is no select policy, so nothing can
-- read the list back through the API.
create table if not exists public.emails (
  id         uuid        not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  email      text        not null unique,
  user_id    uuid        references public.users (id) on delete set null,
  source     text
);

alter table public.emails enable row level security;

create policy emails_insert_any on public.emails
  for insert to anon, authenticated
  with check (true);
