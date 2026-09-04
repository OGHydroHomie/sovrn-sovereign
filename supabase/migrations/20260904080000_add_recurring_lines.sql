-- Every reading ends two of its sections on a quoted line: the recognition that
-- closes WHO YOU ARE, and the first-person declaration that closes ONE ACT.
-- Both were written once, read once on the reveal, and then only recoverable by
-- re-parsing the blueprint text. They belong to the person, not to a day, so
-- they sit on the users row and can be brought back on any surface.
alter table public.users add column if not exists recognition_line text;
alter table public.users add column if not exists declaration_line text;

comment on column public.users.recognition_line is
  'The quoted line closing WHO YOU ARE. Surfaced on the Ledger while a day is open.';
comment on column public.users.declaration_line is
  'The quoted first-person line closing ONE ACT. Surfaced above the read in the morning email.';
