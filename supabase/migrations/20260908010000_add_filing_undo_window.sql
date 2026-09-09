-- Filing was instantly permanent in both directions. A mistaken tap on the wrong
-- button wrote a permanent lie, which is the same failure as the one-button
-- Ledger, arrived at from the other side. Thirty seconds to take it back.
--
-- The window is enforced here rather than in the browser, because a UI timer is
-- a suggestion.
alter table public.ledger_entries add column if not exists filed_at timestamptz;

comment on column public.ledger_entries.filed_at is
  'When the day was filed, either way. Set by trigger, never by the client. The undo window is measured from it.';

-- Server-authoritative. If the client could write filed_at it could hold its own
-- undo window open forever, which is the same as not having one.
create or replace function public.stamp_filed_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.what_happened is not null and old.what_happened is null then
    new.filed_at := now();
  elsif new.what_happened is null then
    new.filed_at := null;
  else
    new.filed_at := old.filed_at;
  end if;
  return new;
end $$;

drop trigger if exists ledger_stamp_filed_at on public.ledger_entries;
create trigger ledger_stamp_filed_at
  before update on public.ledger_entries
  for each row execute function public.stamp_filed_at();

drop policy if exists ledger_files_once on public.ledger_entries;
create policy ledger_files_once
  on public.ledger_entries for update
  to anon, authenticated
  using (
    user_id = auth.uid()
    and (what_happened is null or filed_at > now() - interval '30 seconds')
  )
  with check (user_id = auth.uid());
