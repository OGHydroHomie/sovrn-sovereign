# PROGRESS

One paragraph per task: what shipped, what broke, what is open. Appended in
order, newest at the bottom. This log starts on 4 September 2026 — work before
that date is in the git history, not here.

---

## 2026-09-04 · Timezone-correct emails

**Shipped** `765220e`. The Day 2 generator was interpolating raw UTC ISO
timestamps straight into the prompt, so the model faithfully told someone in
Chicago they had committed at 3am when their own Ledger said 10:06 PM. Added
`users.timezone`, captured at intake from the browser's own
`Intl.DateTimeFormat().resolvedOptions().timeZone`, and `/api/day2` now formats
both timestamps into the person's zone before the model sees them, with the
prompt told the time is already local and never to convert. **What broke:** my
first verification assumed `America/Detroit` and produced 11:06 PM — the
assumption was wrong, not the code; and a `.select()` edit silently failed to
match, so `timezone` was never actually fetched in `morning.ts` until the
typecheck caught it. **Open:** every account created before the column existed
has `timezone` NULL and falls back to the neutral "yesterday" phrasing.

## 2026-09-04 · Return to your Ledger

**Shipped** `f96ec20`. A Ledger lives on an anonymous session in one browser, so
someone on a new phone had no route back. A link under the hero CTA now sends
Supabase's own magic link. Two deliberate constraints: `shouldCreateUser: false`,
without which typing any address mints a new empty account and signs the person
into a Ledger that is not theirs while their real one becomes unreachable; and an
identical response whether or not the address is known, because "no account with
that email" turns a box on a public page into a way to test whether a given
person has used SOVRN. **What broke:** nothing. **Open:** nothing.

## 2026-09-04 · Per-user send time

**Shipped** `bbdf476`. The cron fired once daily at 6am UTC — 1am in Chicago. It
now ticks every 15 minutes and sends only to people whose own clock has just
turned 6. Quarter-hourly is required, not cautious: India is +5:30, Nepal +5:45,
Chatham +12:45, and an hourly schedule never lands on the top of the hour in any
of them. The read order inverted to match — users first, filtered to who is due,
then entries for only those people — so most of the 96 daily ticks cost one query
and nothing else. `isDue` is exported so the test bundles and calls the real
module rather than a pasted copy. **What broke:** nothing; a sweep across all 96
ticks confirmed each zone fires exactly once. **Open:** `.in('user_id', dueIds)`
puts the due list in a query string and wants to become a server-side filter
before any single zone holds more users than a URL can carry.

## 2026-09-04 · Loading animation

**Shipped** `9bd7ba2`. Replaced the hairline with the logo square: it breathes
(1.0–1.03 over 4s), fills from a 2px outline to solid over ~20s driven off an
elapsed-time clock rather than a fixed animation, and on completion scales up and
dissolves into the archetype name — set in exactly the type, weight and colour
the reveal uses, with App holding on the loading screen until the dissolve
finishes so the name is revealed once instead of on two consecutive screens.
**What broke:** seeding the fill level into state left `prefers-reduced-motion`
viewers looking at a permanently empty square, because `useReducedMotion` can
resolve after first paint; the level is derived at render now. **Open:** the
handoff has never been watched in a browser — no browser tooling in this
environment.

## 2026-09-04 · Read line promoted

**Shipped** `f49b3c4`. The one sentence naming what yesterday actually was
existed only inside the 6am email — read once and discarded — while the Ledger
opened straight onto an instruction. It now leads `/ledger`, above the act and
larger than it. Required a column: `ledger_entries.read_line`, written by the
morning send, because the read is generated per day out of that day's evidence
and belongs to the entry rather than the person. **What broke:** nothing.
**Open:** the Day 2 already on the record had its read line generated, emailed
and thrown away with nowhere to recover it from, so the first read line to appear
on screen will be Day 3's.

## 2026-09-04 · Explainer card

**Shipped** `dc71722`, retired by `35ff2aa`. Two sentences at the bottom of the
Ledger saying tomorrow's act is written from today's, including from a day where
nothing happened — the most useful fact about the engine and the one most likely
to bring someone back. Shown after the first commit and, following a follow-up
instruction, retired the moment any day past day one exists: once the promise has
been kept in front of them the card stops explaining anything. Gated on
`day_number > 1` rather than a row count. **What broke:** nothing. **Open:**
nothing — though the one account with a Day 2 will never see it.

## 2026-09-04 · Villain mode signal

**Shipped** `02315d1`. A gated line at the bottom of the Ledger, appearing only
after three days both committed and completed; tapping writes to a new
`villain_signals` table and shows a placeholder that says plainly there is
nothing behind the button yet. The table takes one row per person, not one per
tap — a unique index on `user_id`, because the question is how many people want
this and an unbounded table measures enthusiasm for tapping. Write-only from the
browser (insert-own, no select policy, same shape as `emails`), and the FK points
at `public.users` so the existing CASCADE chain means `/api/delete` needed no
change. **What broke:** the placeholder's failure line shipped saying "Check your
connection", the exact phrasing the copy pass exists to remove; swept in
`496b775`. **Open:** nobody has met the three-day gate yet, so the button has
never been rendered to a real user.

## 2026-09-04 · Recurring lines

**Shipped** `156caaa`. Every reading closes two sections on a quoted line — the
recognition ending WHO YOU ARE and the first-person declaration ending ONE ACT —
and both were seen once on the reveal and then existed nowhere but inside prose
in localStorage. Both are now parsed at generation time into columns on the users
row, with the recognition returning to the top of `/ledger` while a day is open
and the declaration opening the morning email above the read. The parser takes
the last quoted line of each section, scanning backward, so a mid-paragraph
quotation cannot beat the closing line. **What broke:** nothing; verified against
the real module — both lines extracted, mid-paragraph decoy rejected, unquoted
reading degrades to empty without breaking the acts. Also added HTML-escaping to
the email while in there, since an ampersand in someone's own declaration would
have opened an entity and eaten the next characters of their line. **Open:**
neither line can be backfilled, because the full reading only ever exists in the
browser that generated it; existing records fill in the next time that person
opens the site on that device.

## 2026-09-04 · System copy personality pass

**Shipped** `16eddf9`, plus `496b775` and `60deb4f`. The empty Ledger, the
loading screen, the error states and the moment after committing were written
like form validation. Rewritten dry and warm under one rule: the joke is always
at the app's expense or about its machinery, never about the person's behaviour.
"Check your connection" is gone from every failure state — it sends someone to
look at their router for what is usually a server problem — replaced with the
fact that actually helps. The moment after committing was silent and now asks for
the thing the entire next day is generated from. **What broke:** I committed a
sweep claiming to have removed the last "Check your connection" and had not —
`/delete` carried it wrapped across two source lines, so a single-line grep missed
it and I claimed a completeness I had not verified; found by grepping the
deployed bundle instead. **Open:** nothing; zero occurrences ship, verified
across `src/` and `api/`.

## 2026-09-04 · Day 7, the recalibration

**Shipped** `a9bbfff`, `f5917da`, `e6007cd`, `9214bb8`, `eb317f9`. The product had
a beginning and a middle and nothing pulling anyone through it. Day 7 now routes
away from the mission generator entirely: a pattern-level read of the whole week,
the full record with gaps rendered as gaps and nothing scored, the becoming
resolving out of the square with the same motion the loading screen uses, and one
question in their own words from intake — is that still what you want. The answer
re-runs the becoming against the same thirteen, held by default. From day 8 the
daily generator reads the whole record rather than only yesterday. **What broke:**
plenty, and all of it before it shipped. `max_tokens: 1024` was silently
truncating — thinking is spent before the JSON is written — so two of three first
attempts came back unparseable and one leaked a `"}` into the prose. The app grew
a narrator ("What I want to say plainly is…") when it has never spoken as "I". The
recalibration reason was written in the third person about the person reading it.
The first cut of the read ran to 170 words of chained clauses on the one screen
that is meant to be a payoff. The selection moved HEADLINER to LOCKSMITH off "I
want to stop needing to be certain before I move" — which is the Opening Act's own
loop, not a new want — and justified it with the word "authorized", the same
justify-after-choosing failure the blueprint prompt was fixed for. And a run that
needed all three attempts took 70 seconds against a 60-second `maxDuration`, which
would have timed out in production. Every one of those is fixed and re-verified.
**Open:** `/api/morning`'s day 7 branch has never executed — it needs
`SUPABASE_SECRET_KEY`, which is not in `.env.local`, so the routing, the entry
insert, the magic link and the send are reviewed but unrun; the same is true of
`/api/recalibrate`'s auth and write path, though the selection itself ran for
real. No Day 7 screen has been seen in a browser. Nobody is on day 7 yet, so the
first real one will be the first one anybody sees.

## 2026-09-04 · api/ was never type-checked

**Shipped** `eb317f9`. `npm run build` runs `tsc -b`, which never looked at `api/`
— Vite does not compile it and the app's tsconfig does not include it. Adding
`tsconfig.api.json` to the project references caught two errors in the new day 7
code and three unknown-typed values in `generate.ts` and `morning.ts` that had
already shipped. `CLAUDE.md` now records this alongside two other rules, each
written next to the failure that produced it. **What broke:** nothing new — this
is the fix for a class of failure that had already produced one production 500
from an extensionless ESM import. **Open:** nothing.

## 2026-09-04 · Day 7 verified live, then two voice failures fixed

**Shipped** `76e24a1`, `34121d4`, `36174cc`, `2aa5622`. Day 7 ran end to end against
a seeded six-day account — email, screen, week read, record with the gap, and a
recalibration that held with a week-referencing reason — and the seed was deleted
before it could become a day 8 in the morning cron. Two failures showed up only
once a real person read the output. The week read's warmth was not landing on
mixed weeks: the prompt named warmth's target for thin weeks and for strong ones
but not for the most common shape, and it contradicted itself, because the line
added to stop a five-sentence overrun also forbade the closing turn that makes
warmth work. And the recalibration reason cited the person's own answer as its own
evidence — museum owner, bar, all of it from their sentence thirty seconds
earlier, which is what a horoscope does. The reason must now cite the record: an
act, a time, an open day, a gap, or something they wrote, enforced by a check
tuned against the real failing sentence. **What broke:** three of my own fixes
broke something else on the way. Naming the warmth mechanism with two concrete
examples turned them into templates — three of five generations closed on "rarer
than any single act on this list" verbatim. Requiring the warmth to be welded to
the final sentence made that sentence too long for the thirty-word cap, and the
strong week was rejected three times and silently fell back to the hard-coded
paragraph, losing its pattern read; that was caught only by checking `source` on
the response rather than reading the prose. The first version of the
record-citation check passed the exact sentence it existed to reject, because
"name" and "will" appear in act text. **Open:** `/api/morning`'s day 7 branch is
now verified, but nobody real has reached day 7, so the next one will be the first
unattended run.

## 2026-09-04 · Day 7 sentence cap relaxed to 33

**Shipped** `9ecfe80`. The thirty-word per-sentence cap on the week read was the
binding constraint on four of five generations, costing a retry each time. That
matters more than latency: a run that exhausts its three attempts does not surface
as a long sentence, it silently falls back to a paragraph with no pattern claim in
it and still returns 200. Retries across the five shapes drop from five to three,
and all three remaining are genuine runaways at 39, 41 and 46 words rather than
marginal misses at 31 and 32. **What broke:** nothing — the word total, not the
sentence cap, is what keeps the read from becoming an essay, and it is unchanged
at 80 to 110. **Open:** nothing.

## 2026-09-05 · The thirteen archetype marks

**Shipped** `8795177`. The art landed and needed four fixes before it could go
out. Twelve files were missing the `the-` prefix the app derives from the
becoming name, so every one would have 404'd and fallen back to the square; a
thirteenth arrived as `bartender.svg`, which is not a becoming — it is THE CLEAN
SLATE, renamed only after confirmation, because the file carries no title and its
metadata names only the generator. All thirteen opened with a full-bleed opaque
white path, which on cream is a white tile behind every mark and in the middle of
the PNG export. Each carried a C2PA provenance manifest worth roughly half its
bytes: stripping it took the set from 263KB to 122KB. The reveal gives the mark
room it did not have — 96px to `clamp(220px, 58vw, 280px)`, the gap to the name
down to 14px so they read as one object, top padding to 9vh to pay for the extra
height, and the 16vh of dead space above the cards replaced with a fixed 56px.
The Ledger header keeps the solid square: at 16px a shaded illustration is a
smudge. `README.md` now allows greyscale, records the header decision and the
metadata rule, so the next batch does not repeat any of it. **What broke:** my
backup step silently failed before I edited thirteen files — the shell was still
inside `public/marks` from a previous command, so `cp public/marks/*.svg` matched
nothing and I proceeded on a backup that did not exist. Nothing was lost, because
the edit was one known path per file and every removal was logged, but the copy
should have been checked before the write. **Open:** the marks have never been
seen rendering in a real browser — there is none in this environment — so the
reveal, the Ledger header and the PNG export are verified structurally and by a
composite preview, not by looking at the running app.
