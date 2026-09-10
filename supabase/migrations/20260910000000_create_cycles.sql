-- A cycle is one named thing a person has been avoiding, and the thirty days
-- they have to cross it. Before this the product generated acts indefinitely
-- with no target and nothing that could ever be finished.
create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  opened_at timestamptz not null default now(),
  closes_at timestamptz not null,
  target_stated text not null,      -- their words; the ambition the cycle serves
  target_admitted text not null,    -- what was admitted after narrowing
  rubric text not null,             -- the observable boundary, agreed up front
  cost text not null,               -- what it costs them that it has not happened
  crossed_at timestamptz null,
  crossing_entry_id uuid null references public.ledger_entries (id) on delete set null,
  closed_at timestamptz null,
  close_reason text null check (close_reason in ('crossed', 'expired', 'retired')),
  cycle_number int not null default 1
);

-- One open cycle at a time. A person aiming at two things is aiming at neither.
create unique index if not exists cycles_one_open_per_user
  on public.cycles (user_id) where closed_at is null;
create index if not exists cycles_user_opened on public.cycles (user_id, opened_at desc);

alter table public.ledger_entries add column if not exists cycle_id uuid
  references public.cycles (id) on delete set null;

alter table public.cycles enable row level security;
drop policy if exists cycles_select_own on public.cycles;
create policy cycles_select_own on public.cycles for select
  to anon, authenticated using (user_id = auth.uid());
drop policy if exists cycles_insert_own on public.cycles;
create policy cycles_insert_own on public.cycles for insert
  to anon, authenticated with check (user_id = auth.uid());
drop policy if exists cycles_update_own on public.cycles;
create policy cycles_update_own on public.cycles for update
  to anon, authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The pass condition cannot move. The person agreed to this boundary before they
-- attempted anything, so it cannot be tightened afterwards — or loosened, which
-- is the same dishonesty pointing the other way.
create or replace function public.freeze_cycle_terms()
returns trigger language plpgsql as $$
begin
  if new.rubric is distinct from old.rubric then
    raise exception 'cycles.rubric is immutable once written';
  end if;
  if new.target_admitted is distinct from old.target_admitted then
    raise exception 'cycles.target_admitted is immutable once written';
  end if;
  if new.target_stated is distinct from old.target_stated then
    raise exception 'cycles.target_stated is immutable once written';
  end if;
  return new;
end $$;

drop trigger if exists cycles_freeze_terms on public.cycles;
create trigger cycles_freeze_terms
  before update on public.cycles
  for each row execute function public.freeze_cycle_terms();
