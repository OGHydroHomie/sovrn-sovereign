-- The reading itself has only ever lived in localStorage on the browser that
-- generated it. blueprint_json keeps the becoming, the loop and the two acts —
-- the parsed skeleton — but not one word of the prose, so a person arriving from
-- a magic link on a new device could reach their Ledger and nothing else.
--
-- Null for every reading generated before this column existed. Those backfill
-- themselves the next time that person opens the site on the device that still
-- holds the text, which is the same way recognition_line and declaration_line
-- recover.
alter table public.users add column if not exists blueprint_text text;

comment on column public.users.blueprint_text is
  'The full reading as generated. Source of truth for /blueprint; null for readings that predate the column.';
