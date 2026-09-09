-- The Ledger could only record one outcome. completion_requires_text said text
-- exists only when completed_at does, so "I didn't do it, and here is what
-- happened instead" was unrepresentable — the only control was "It's done", and
-- a person who did not do the act still filed it as a completion.
--
-- what_happened now means "they filed this day". completed_at still means "and
-- they did it". A day with words and no completion is an honest open day.
alter table public.ledger_entries drop constraint if exists completion_requires_text;

-- The IS NOT NULL guard is load-bearing. Without it the second branch is
-- `length(btrim(NULL)) > 0`, which is NULL rather than false; `false OR NULL` is
-- NULL; and a CHECK constraint passes on NULL. The branch meant to demand text
-- would abstain in exactly the case it exists to catch, letting a completion
-- through with no words at all. Caught by probing the constraint rather than by
-- reading it.
alter table public.ledger_entries add constraint filing_requires_text check (
  (what_happened is null and completed_at is null)
  or (what_happened is not null and length(btrim(what_happened)) > 0)
);

-- Filing is once, whichever way it goes.
drop policy if exists ledger_complete_once on public.ledger_entries;
create policy ledger_files_once
  on public.ledger_entries for update
  to anon, authenticated
  using (user_id = auth.uid() and completed_at is null and what_happened is null)
  with check (user_id = auth.uid());
