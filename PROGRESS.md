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
