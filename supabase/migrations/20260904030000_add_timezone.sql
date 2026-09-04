-- IANA timezone captured from the browser at intake, e.g. "America/Detroit".
--
-- Nullable on purpose. A session that never reaches intake has none, and every
-- consumer must degrade to timezone-free phrasing ("yesterday") rather than
-- assume UTC — assuming UTC is what produced a morning email telling someone in
-- Detroit they committed at 3am when their own Ledger said 10:06 PM.
alter table public.users add column timezone text;
