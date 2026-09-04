-- Day 7 asks the person, in their own words, whether what they said they wanted
-- seven days ago is still it. Those words were only ever in the browser, so the
-- server had nothing to quote back.
alter table public.users add column if not exists desired_reality text;

-- The recalibration itself.
alter table public.users add column if not exists recalibration_answer text;
alter table public.users add column if not exists recalibrated_at timestamptz;

-- The becoming carries "in progress" until day 7 resolves it. Null means
-- unresolved, which is every account before its first recalibration.
alter table public.users add column if not exists becoming_resolved_at timestamptz;

-- Append-only trail. `archetype` holds the current becoming; this holds who they
-- have been. One entry per recalibration whether or not the name changed — a
-- becoming that held under examination is part of the history too, and the
-- previous value must survive being overwritten.
alter table public.users add column if not exists becoming_history jsonb not null default '[]'::jsonb;

comment on column public.users.desired_reality is
  'Their intake answer, verbatim, quoted back on day 7.';
comment on column public.users.becoming_history is
  'Append-only: [{at, from, to, changed, reason}]. One entry per recalibration.';
comment on column public.users.becoming_resolved_at is
  'Set when day 7 resolves the becoming. Null while it still reads "in progress".';
