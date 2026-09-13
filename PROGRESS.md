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

## 2026-09-08 · GSAP, and one animation runtime

**Shipped** `b2d0ac0`, `b15eb49`. GSAP replaces Rive as the animation layer and
then replaces framer-motion as well, because two animation libraries were
shipping for one product. Every duration moves into `src/lib/motion.ts`. The
loading square's fill stops being a `requestAnimationFrame` loop writing React
state sixty times a second and becomes one interruptible twenty-second tween; the
mark fades in behind the name on the reveal; the three cards stagger and their
panels get a measured height transition. Bundle: 327KB before any of it, 352KB
carrying both libraries, **312KB** on GSAP alone — 15KB under the starting point.
**What broke:** the quiz question swap loses its directional slide. `Fade`
animates entrances only, because keeping exits means holding an unmounted element
alive to animate it, which is most of `AnimatePresence` and all of its weight.
**Open:** nothing.

## 2026-09-08 · The Ledger could lie

**Shipped** `aa13ab3`. The only completion control was "It's done", so a person
who had not done the act still filed it as complete — QA wrote "I have not sent
an illustration" and it recorded as a completion. The cause was in Postgres, not
the button: `completion_requires_text` said text exists only alongside a
completion, so "I didn't do it, and here is what happened" was unrepresentable.
`what_happened` now means the day was filed and `completed_at` still means they
did it; two controls of equal weight, text required for both, and a not-done day
renders as an open day with their words on it. Filing can be undone for thirty
seconds, enforced by the update policy with `filed_at` stamped by a trigger so
the client cannot hold its own window open. **What broke:** my first version of
the constraint let a completion through with no words at all —
`length(btrim(NULL)) > 0` is NULL, `false OR NULL` is NULL, and a CHECK passes on
NULL, so the branch written to demand text abstained in exactly the case it
existed for. Found by probing the constraint rather than reading it. **Open:**
undo is per-session state, so a filing cannot be taken back after a reload even
inside the thirty seconds.

## 2026-09-08 · Browser QA, ten findings

**Shipped** `0cde0a7`, `833e682`, `87cb028`. An act could prescribe the loop — a
reading named deadline-setting as the avoidance and then told the person to write
tomorrow's date and close the file — so both generators now carry the rule and a
second model checks each act against THE PATTERN, regenerating with the reason
attached. Reading the privacy page mid-intake destroyed all eight answers: legal
links open in a new tab and answers are persisted on every change. The rest:
return control offers a direct link when a session exists and can resend or
correct the address; the identity number is derived from the reading instead of
`Math.random()`; the reflection no longer renders twice; hero text moves from
#9A9A9A (2.70:1, fails AA at every size) to #6E6A66 (5.14:1); the hero states
what you get, that an email is required and that answers are stored, none of
which appeared before question eight; and the blurred sample is legible and
labelled instead of a 6px smudge that read as a failed render. **What broke:**
nothing new. **Open:** #9A9A9A still fails in twelve other files — a palette
sweep, not a hero fix, and undecided.

## 2026-09-09 · Filing on every surface, and the session

**Shipped** `4ad6b24`, `190f18c`, `6b02be2`, `6ec2efd`. The "I didn't do it"
control looked missing on `/ledger`; it was there, but `/ledger` was not
rendering the Ledger. Day 7 was unfiled, so `pickCurrent` selected it, the Day 7
screen rendered instead, and that screen had no filing controls at all — five
open days were printed on the week record and none of them could be answered. The
underlying fault was that the filing block had been written twice and Day 7 had
neither copy, so `FileDay` is now the only definition and the Ledger, the reveal
and Day 7 all render it. Day 7 files the most recent unfiled act, and filing it
reveals the one before. The 6am email now leads with a plain `/ledger` URL rather
than Supabase's verify endpoint, because almost everyone opening it is already
signed in and the round trip turned an expired link into an error page for people
whose session was fine; the magic link stays underneath for a device that has
never seen the account. The hero links straight to the Ledger when a session
exists. And the app is installable: `start_url` is `/ledger`, the icons are PNGs
written byte by byte rather than by adding a rasteriser, and the prompt appears
once there is a record worth returning to. **What broke:** nothing new, though the
PWA tags added a second `theme-color` meta that had to come back out. The session
config was never the problem — `persistSession`, `autoRefreshToken` and a stable
storage key were all already correct; the loss is browser storage eviction, which
no client setting defeats and installation does. **Open:** iOS fires no install
event, so that path is instructions rather than a button, and nobody has yet
installed it to confirm the session survives in practice.

## 2026-09-09 · Contrast sweep, and a deploy check that checks

**Shipped** `1834044`. `#9A9A9A` on the paper ground is 2.70:1 and fails AA at
every size, so the twenty-one live-text occurrences across twelve files move to
`#6E6A66` at 5.14:1 — QuizPage alone had eight, on the screen where someone types
their deepest fear. Four are left: disabled button labels, which WCAG 1.4.3
exempts and which would announce a control as available if darkened. The `faint`
token is retired as a distinct text colour and aliases `mute`, because the
lightest neutral clearing 4.5:1 on `#FBFAF7` is `#737373` at 4.54 — one percent
above the line and indistinguishable from mute. The palette wanted three inks;
the ground supports two. The deploy check now hashes every stable-path file in
`dist/`, fetches the same paths and compares content, instead of comparing the
hashed JS filename — a proxy that went green twice in one day on deployments that
had not happened, once for the marks and once for a meta tag, both times because
the bundle was byte-identical. **What broke:** nothing; the new check was run
against the pre-deploy state first and correctly reported `/index.html` stale,
which is the exact case the old one could not see. **Open:** nothing.

## 2026-09-09 · The art spec off the open web, and the deploy check corrected

**Shipped** `83bb979`, and the check that found it. `public/marks/README.md` was
an internal art spec served at a stable URL, because everything under `public/`
ships; it is `docs/marks.md` now and `CLAUDE.md` carries the rule that produced
it. Then the deploy check turned out to have two holes of its own. It could not
see a deletion — every remaining file still matched, so removing the spec passed
trivially — and it compared `index.html` byte for byte, which cannot work when
the deployment is built on Vercel's Node 24 and the comparison runs on local Node
25: the same source produces the same logical output under a different content
hash. Deletions are now derived from git and asserted to 404, `index.html` is
compared with its fingerprints normalised, and `--expect` asserts substrings are
present in the assets the deployed page actually references. **What broke:** I
reported the move as verified on a green that was partly luck, and separately
checked the removed URL with a `curl` that had no cache-buster and read a stale
200 from the edge — the exact failure the script's cache-buster exists to
prevent, in a hand-rolled check beside it. Production was correct the whole time.
**Open:** nothing.

---

**2026-09-11 — The processed marks, verified through a browser.** The thirteen
replacement marks are in and confirmed from production, not from disk: every one
is 1080×1620, 1-bit, 4.9–24.7 KB, and the thirteen together are **163 KB over the
wire on `/about` — down from 8.5 MB**, a fortieth of the weight. `MARK_ASPECT`
moved from `896/1216` to `1080/1620`; the old value was 0.7368 against a true
0.6667, close enough to look plausible and wrong enough to letterbox every mark
on the site. A headless pass over production `/about` decoded each rendered image
and found exactly **2 tones — [0, 255]** in all thirteen, rendering at 0.6667
undistorted. The full loop check then passed 41/41 against a real account,
including three new assertions that decode the exported card and locate the mark
inside it: the mark box holds 149,743 ink pixels, the gutters either side are
clean, and the ink's aspect on the card matches the source file's to three
decimals. The axis-constraining was left alone, as instructed — reveal sets
width, Ledger header sets height, card holds height at 480. **What broke:** three
things, all mine. The deploy check sat timing out against `/marks/.DS_Store`, a
file macOS writes into any folder opened in Finder and Vite copies wholesale out
of `public/` — `.gitignore` kept it out of the repository but could not keep it
out of the build, and Vercel will not serve a dotfile, so the check was demanding
a 404 forever; dotfiles are skipped now. The loop check itself was stale in two
places: it clicked every panel header blindly, which *closed* the ONE ACT panel
that now opens by default, and it went looking for the card control up on the
fresh reveal when that control is deliberately withheld until an act is
committed. Worst of the three: cleanup lived at the end of the happy path, so
when the card assertion failed it never ran, and the run left a live account
carrying a real email address in the database with no session anywhere that could
delete it. Two orphans were removed by hand through the same sequence
`/api/delete` uses — `emails` first, since it is the one table that does not
cascade — and cleanup now runs in a `finally`, because an assertion failing is
the normal case for a test and must not be the case that leaks data. **Open:**
nothing.

---

**2026-09-11 — Build B: the crystallization reveal.** Seventy-eight frames, six
per mark, near-chaos to resolved, with x6 byte-identical to the base mark so the
last frame and the settled picture are the same file rather than two that have to
be kept in step. The reveal opens on frame one at full card size and crystallizes
over 1.6s, holds a full second on a finished picture with nothing else on screen,
stamps the name at 2.6s, brings the loop line at 3.4s and rises the three
sections at 4.0s. The advance is **one eased tween, not five cross-fades** — a
single `power2.out` value walks 0→5 and every frame reads its opacity off it, so
the ease governs the advance rather than each hand-off, and no two adjacent
frames are ever both half-transparent, which on a 1-bit image reads as a flicker.
Measured on production with one real generation: 1495 / 2612 / 3414 / 4013ms
against 1600 / 2600 / 3400 / 4000, the hold sixty frames long with the name
showing in none of them, and the per-frame advance running 115 / 134 / 166 / 250 /
817ms — fast, then settling. **The hand-over holds.** The square was last painted
at 51742ms at opacity 1.000 and the card first painted at 51763ms, also at 1.000,
with zero rendered frames in between: there is no frame of empty paper between
the two screens. It is honestly a cut and not a morph — the black rectangle goes
from 180×180 at (125,283) to 249×374 at (90,125) in that one frame — but the
ground never breaks. Failure was tested four ways (one frame missing, all
missing, the last missing, and never responding) and every one falls back to the
finished mark alone after at most a 6s cutoff, so a slow network never holds the
reading hostage; reduced motion fetches exactly one file and cross-fades it in
over 400ms. **What broke:** three things. The build uncovered a bug that was
already live — `autoFocus` on the target textarea made the browser scroll it into
view the moment the reveal mounted, putting the mark and the name above the top
of the screen, so the entire reveal had been opening scrolled past its own
subject; my first filmstrip came back as blank cream pages, which is the only
reason I found it. The focus is taken with `preventScroll` now and the reveal
scrolls to top like every other transition. The first production run was wasted
because my sampler's window was a flat 45 seconds and the generation took 52 —
it recorded 2700 frames of a motionless square and reported that the reveal never
happened; it is bounded by the sequence now, not by a guess. And my own analysis
script read `lastSquare.o` where the data was at `lastSquare.sq.o`, which printed
"opacity undefined" on the two assertions that mattered most and made a passing
hand-over look like a failure. **Open:** thirty-four empty anonymous accounts
were created in one hour by test loads — every Playwright context mints one — and
they carry no email, no blueprint, no ledger and no cycle. I did not delete them:
anonymous signups are not in the audit log, so nothing distinguishes mine from a
real visitor who opened the site and left, and dropping a live session to tidy up
my own litter is not a trade I get to make unasked.

---

**2026-09-12 — Clearing the litter, and making cleanup survive a kill.** Fifty-nine
empty anonymous accounts were deleted: anonymous, older than an hour, with no
email row, no blueprint, no ledger entry, no cycle and nothing in any of the
eleven columns on the profile row that can hold something a person wrote. The
database went from 112 accounts to 53 with all 13 blueprints, all 19 ledger rows
and zero orphans in any table. Then the thing that produced them was fixed. The
browser check now writes the account it is using to `scripts/.browser-check-session.json`
the moment the app mints it — on the hero, before question one — and the **next**
run deletes that account through the product's own `/delete` flow before it does
anything else. A `--cleanup-only` flag runs just that sweep and exits, because a
cleanup only reachable by starting another run creates another account to clean
up and never terminates. Proven end to end: a run killed with `kill -9` mid-quiz
left account `3e885d15`, and the next run's first line was "previous run left
nothing behind — deleted"; the account, its email row and its profile row were
all gone. **What broke:** three of my own. My first cleanup predicate deleted
nothing at all and claimed 76 accounts "held something", because `email_change`
is `''` rather than NULL and `becoming_history` defaults to `'[]'::jsonb` — I was
testing for NULL on two columns that carry defaults, and had I trusted the zero I
would have concluded the database was already clean. The closing cleanup I first
wrote called the delete helper with a fresh context holding no session, which
would have reported "nothing to delete" and left the account alive — the exact
failure it was written to prevent, and it passes its own assertion while doing
it. And the full check then failed on `WHO YOU ARE: panel is visible — effective
opacity 0.15`: the harness waited a flat 3000ms after the reveal, but the
crystallization holds the sections back until 4.0s, so it clicked a card while it
was still rising and reported the product as broken. It waits on the sections
reaching full opacity now, not on a number of seconds. 42/42 after that. **Open:**
one empty anonymous account from 02:07 was deliberately left — it is younger than
an hour, so it may be someone mid-flow rather than my litter, and the sweep's age
guard exists precisely to not take that guess.

---

**2026-09-12 — Build A: the ascent, deployed.** The last four questions are a
climb. The background is a dither field generated in code on one canvas — the
same Floyd-Steinberg kernel the marks were processed with, run over the viewport
at pixel scale 4, about twenty-one thousand pixels at 4.7ms a redraw. Four
altitudes, and everything visible is a function of one number running 0 to 3, so
there are no presets to step between. It ticks on `setTimeout`, five times a
second while someone reads and thirty for the 1.2s of a move; a rAF loop would
keep the compositor awake for the whole quiz. Reduced motion holds the field
byte-identical over 2.5s and changes density only. Confirmed on production at
`a1511ee`: canvas present, 108×200 buffer, 96.7% ink at the depths, zero dots
over text. The seam assertion folded into the browser check ran for the first
time on the first post-deploy run and passed with real numbers — square last
painted at 56726ms, card first at 56752ms, **0 frames between, 0 empty**, frame
one arriving at opacity 1. 44/44. **What broke:** four things, all mine and all
found by looking rather than reasoning. The clearing behind the words thinned the
field but never removed it — error diffusion cannot be asked to leave an area
alone, and at 94% of the way to paper one dot in twenty still landed on the
letterforms; the field is punched after the dither now, measured at 0.00% over
every text element at every altitude. A move cross-faded density across the whole
screen, so its midpoint was a full screen of 50% dither, which on the way down
from the stars read as a blow-out to white; the altitude is a function of screen
row during a move now and a boundary sweeps. Going back ran the same top-down
sweep as going forward, so it felt like more climb rather than its undoing — it
sweeps bottom-up now. And the first filmstrip I showed **mislabelled the
descent**: I extracted frames by assuming when the Back click landed, so a frame
captured mid-move was presented as a settled one; every strip is now cut from a
clock started at the click and prints the headings it moved between. **What broke
downstream:** the browser check failed its first post-deploy run — not a product
fault, but the harness pacing its clicks at 500ms against a climb that refuses a
second advance for 1.2s, so its clicks were silently ignored, later answers went
into earlier fields, and it waited three minutes for a reveal that was never
coming. It waits for the question to change now. That is the third time this week
a fixed timeout in that file has reported the product as broken. **Open:** a
throwaway production check I wrote to screenshot the climb failed its own
cleanup, leaving one empty anonymous account; I removed it by hand and verified
13 blueprints, 19 ledger rows and zero orphans intact. One-off scripts should use
the check's own recorded-session cleanup rather than hand-rolling it.

---

**2026-09-12 — Twelve changes from a run-through; the paper arrives with the
ink.** Deployed at `ce2d09a`, 45/45 on production. The loading screen now carries
the field the quiz ended on and, once the reading lands, spends six seconds
coming to a complete stop — measured by hashing the canvas rather than asserted:
it stops changing at all at 6.2s, then holds a full second of nothing having
moved. The crystallization enters instead of sharpening: ink at a point spreading
behind a mask of six nested blobs, one per frame, each trailing the one outside
it, so the leading edge is still the noise of x1 while the centre has resolved to
x6. And the hand-over no longer inverts — the reveal opens on the *same frozen
field*, same altitude and same drift phase, written down at the moment everything
stops and read back one mount later, with the paper arriving as a front
travelling out from the same point the ink does. The other ten: three questions
not four; the progress rule drawn into the field instead of laid over it; the
question number inside the hole; the loading caption gone; one control
everywhere, SHARE YOUR CARD, which dropped the PDF and with it `jspdf` — **the
bundle went 1,040 kB to 659 kB, gzip 330 to 205**; the unchosen act disappears;
a route onward to the Ledger; the install prompt above the fold; the card 15%
larger; the wordmark inert once a blueprint exists. **What broke:** the blob was
sized off its profile's *minimum* radius, overshooting by nearly double and
filling the card a second early; the spread easing was two curves that did not
meet at the midpoint, 0.55 against 0.50, so the ink jumped five percent of its
reach in one frame; and the paper first arrived as a uniform lift toward white,
which walks every pixel on screen through the middle of the scale together — a
full-screen halftone churning at the redraw rate, which is static, and the exact
opposite of the stillness the screen before it had just spent six seconds
earning. It is a front now, so only the boundary moves and no dot is ever
reassigned. The field also kept drawing after it had dissolved, and because the
front is computed against the viewport's proportions, a resize re-ran it and
brought the dark back on a finished page; it retires itself now. **The harness
broke five times, all mine:** the mark assertions and the card's source lookup
still expected an `<img>` where the reveal now paints a canvas; the share control
had been renamed; the commit assertion waited a flat 4000ms for a write that
takes three round trips; and the filing waited 25s for a model call. That is the
fourth and fifth fixed timeout in that file to accuse the product of being
broken. Every one of them now waits on the product's own state and, when it does
fail, prints what is actually on screen. **Also:** one deploy verification passed
falsely because I built before committing, so `build-info.json` still carried the
previous sha and matched the old deployment — caught by comparing the deployed
commit, which is the only reason that check exists. **Open:** the loading
square still pops out of existence at the hand-over — the tone and the position
are now continuous, but a cream block disappears in one frame.

---

**2026-09-12 — Dark from the door to the reveal.** The whole path a stranger walks
is now one unbroken descent, and paper appears exactly once. The hero is the
artwork, SOVRN above the doorway and one word — `ascend` — beneath it, with no
sentence: the line that was there had been the threshold's heading word for word.
Going through is a push *into* the door, 1.6s, and the threshold is dark on the
same generated starfield the door opens into. Questions one to four now carry
that field too; the descent into the depths happens at question five as the climb
was designed. **Whole-screen luminance across the path went from 10.6 / 21.6 /
245.5 / 17.4 to 8.6 / 8.0 / 9.4 / 9.8 / 11.2.** The native date and time pickers
were the last things that could not be made dark — a browser's own control brings
its own palette — so they are numeric parts now: day, month, year, hour, minute.
The parts are the source of truth while someone types and the ISO strings are
derived, so a half-typed year cannot make a birth date in the year 1 and the 31st
of February is refused. "I don't know my birth time" became a control rather than
a footnote; the intercepted generate payload confirms it degrades by design —
`birthTimeUnknown: true`, `Houses verified: NO`, which routes the prompt to its
own branch. Contrast was measured against what is actually behind each element by
sampling the canvas under its box: 27 of 27 pass, worst 8.53:1 against a 4.5 bar,
dropdown rows 18.75:1. 48/48 on production at `f556d1a`. **What broke:** two
measurements of mine and four harness assumptions. I sized the door's blob off
its profile's *minimum* radius, so at the brief's 3.2× the frame cut the figure
at mid-torso; the geometry caps at 1.86 and it runs at 1.8. I assumed the
generated field could meet the artwork's stars at the quiz's own setting — the
painted stars are 0.18% of pixels lit and the quiz's fourth altitude is 1.82%,
ten times apart, so the density is a parameter now and the hero runs at the
artwork's number. Then the browser check: it asked the hero for an `h1` that no
longer existed and waited thirty seconds for it — which was also a real gap,
since a landing page with no heading cannot be announced, so SOVRN is the heading
now; it entered through a button that is gone; it typed an ISO date into a
two-digit day box and then blamed the product when Next stayed disabled; and my
"nothing is on paper" assertion read `document.body`'s background, which is cream
for the whole app while every page paints over it — it measures the rendered
screen now. **Open:** the disabled Next button sits at about 4.2:1, under the
4.5 bar but inside the inactive-control exemption, and it was the same on paper.

---

**2026-09-12 — Voice input, and the read as the headline.** Two builds, both
deployed at `645ac44`, 49/49 on production. **Say it instead:** a mic in the
corner of the six fields people write themselves into — the fear, the life, the
pattern, the target, the cost, and the filing. Web Speech, no dependency. Words
land as text and stay editable, dictation appends rather than replaces, and where
the browser has no recognition nothing renders at all. A refused microphone
removes its own control, because refusal cannot be undone inside a session and
leaving it would be a button that does nothing forever. **The read is the
headline:** it was the smallest thing in the morning email — declaration 17px,
read 15px in grey, act 19px in black — so the one line written about this person
this morning came third, under two lines that are not it. It now opens the body
at 26px in black, and the **subject line is the sentence itself** rather than
"Day 4", trimmed at a word boundary. On the Ledger it is 27px against the act's
16px. Day seven deliberately keeps its own subject and still carries no read: the
week read is the payoff of the whole seven days and it is spent the moment it
lands in an inbox. **What broke:** the subject trim was one character over its
own limit, because the ellipsis was appended after slicing to the limit rather
than inside it — which is the entire point of having one; the mic glyph was at
the muted colour *and* 0.75 opacity, measuring 2.54:1 on the cream reveal against
the 3:1 a control needs, so the opacity is gone and quiet is a colour; and my
`/ledger` probe printed "the session this used was deleted" from inside a
`.catch(() => {})`, so it reported a cleanup that had not happened. **Open, and
mine:** accounts had grown to 160 because every local Playwright context mints an
anonymous identity and my ad-hoc probes do not use the check's recorded-session
cleanup. Swept 127 empty anonymous rows older than an hour plus the one probe
account by hand; 33 accounts left, 14 blueprints and 22 ledger rows intact, zero
orphans. The browser check cleans up after itself; my one-off probes still do
not, and that is the third time this has come up.

---

**2026-09-13 — The install screen, stripping at commit, and the Wall.** Three
builds, all deployed and verified. **Keep it:** a full screen after the first act
on the same dark field, Chrome getting a control built on the held
`beforeinstallprompt` and iOS getting the instruction, because it fires no event
and can only be told. Anything that cannot install a web app never sees the
screen at all. Asked once, once more if refused, then never. There is no second
commit gesture in this product — only day one has one, and every day after is
written by the 6am job with `committed_at` already set — so the second asking
fires the morning a second day exists, which is also the morning its own promise
has been kept. **Stripping at commit:** a public version of each act, generated
once and stored in `ledger_entries.public_act`, with names, companies, amounts,
places and relationship specifics removed and the verb and object kept. An act
that cannot survive stripping stores null, appears nowhere, and costs the person
nothing — they are not told and there is nothing to fix. A commit never waits on
a model: the act is written first and the public line is a separate request
nothing blocks on, so slow, unreachable and keyless all produce the same outcome.
The model is the first gate and not the only one — what it returns is checked for
surviving names, amounts, days, times and lines so vague they say nothing, then
passes `_safety` like every other generated line. **The Wall:** `/wall`, served as
HTML by a function and cached at the edge, readable with scripting switched off
entirely, ~6 KB on the wire. Nobody is identifiable on it; a miss renders exactly
like a crossing; the viewer's local day comes from the request's timezone header
so the first paint is already right, falling back to UTC, with the cache varying
on it. A person's own rows are marked to them by a hash of the entry id their own
browser holds. Verified end to end on production: an act committed through the
real loop appears on the wall as a stripped line keyed to that browser. 50/50.
**What broke:** four things, three of them mine and one still open. The
proper-noun gate matched the first word of every act, because it was anchored on
`^` and every act opens with an imperative — it withheld ten out of ten and
reported the reason as proper noun "Send". The install count was incremented
rather than set, so it counted mounts instead of askings and React's development
double-invoke took it from 1 to 3, burning the second occasion silently. The
wall's starfield ran at full density across the whole page and the counter read
through a screen of dots; it is confined to the margins now, with 0 star pixels
inside any of 19 text boxes. **And the one that is not a bug but is worse:** I ran
`git add -A` and swept two unrelated builds into one commit, so the stripping
shipped under the install screen's message and its rationale exists nowhere in
the history — it is in this entry instead, because rewriting pushed history to
tidy my own mistake is not a trade worth making. The same blanket add shipped 21
mark files for `the-devil`, `the-hermit` and `the-sun` that I had never opened.
They are well-formed and match the house spec exactly, but those three are not
among the thirteen becomings, so nothing can reference them and they are now on
the public web. Left in place pending a decision rather than deleted. **Open:**
those 21 files; and the acts step in the browser check timed out once at 20s and
passed on the next run, which is the second time that generated step has been
slow rather than broken.

## Trials, Part 1 — the mechanic

Shipped the trigger detection, the state machine and the act wrapping; the card
is a placeholder box and the arrival ceremony is deliberately absent. Three
figures fire from evidence only: the Devil on two filed misses inside one cycle,
the Hermit on two or more unanswered mornings followed by a return, the Sun on
two finished acts while the boundary still needs contact with the world. State
lives in a new `trials` table with a partial unique index for one active trial
per person and a second index that stops a figure recurring inside a cycle it has
already been freed or rejected in. Every encounter is stamped onto the
`ledger_entries` row it wrapped. The evaluation runs on arrival at the Ledger
rather than at 6am, because a return is only visible when somebody returns.
`this isn't it` marks the row and stores nothing else — no count, no reason.

What broke. The Hermit could never fire on a real history: the rule only counted
a run of silent days once it had *ended*, and today's own entry is unanswered
too, so every genuine history ended in an open run that closed nothing. It passed
twenty-two trigger tests because all of the fixtures ended on a filed day. Found
only when the endpoint was driven against histories shaped the way production
makes them. The rule is now "silence is the days before today, and today is the
return". Second: the card was written in the field's palette, `#FBFAF7` on
transparent, which is correct on every dark surface in the product and renders as
nothing on the Ledger's paper — present in the DOM, three text assertions
passing, three hundred blank pixels on screen. Only the screenshot caught it. The
probe now reads contrast against the actually-painted background. Also two
self-inflicted fixture faults worth naming: the fake database was deep-copied so
mutations never reached the handler, and rows were replaced rather than updated,
which wiped the trial stamps the test then reported as never written.

New harnesses, both in the repo rather than as throwaway dotfiles:
`scripts/check-trials.mjs` (53 assertions — triggers called directly, endpoint
driven through the real supabase-js client) and `scripts/probe-trials.mjs` (14
assertions in a browser, real account, real generated act, geometry and contrast
measured rather than assumed). `scripts/lib/bundle.mjs` bundles `api/*.ts` the
way the deployment does so a harness always imports the real module;
`scripts/lib/fake-postgrest.mjs` is enough of the wire protocol for the real
client to talk to it. Also raised the acts-step wait in the browser check from
20s to 45s — opening a cycle is a generated step and has twice been slow rather
than broken.

Open. Nothing here has touched production: `tsc -b` passes across both projects
and the migration is applied, but `/api/trial` has never answered a request on
Vercel. The database behind the endpoint in both harnesses is a fixture — the
secret key is not on this machine — so the handler, client and queries are real
and the rows are not. The Sun's one model call, `boundaryNeedsTheWorld`, was
never fired against Anthropic; both its branches were tested with
`requires_contact` pre-set. The 21 mark files for the three figures are in the
repo and nothing references them yet; that is the arrival build.

## Trials, Part 1 — verified on production

Deployed and confirmed against the live deployment, not a local copy.
`/api/trial` answers: 405 to a GET, 401 with no token, 401 with a token that is
not one, 200 with a real session. All three triggers fire against real rows —
three real accounts, three real quizzes, three real generated blueprints and a
real committed act each, with the days behind them written through PostgREST
using the account's own JWT under RLS, the same path the commit flow itself
writes on. The Devil: "You said yes at 9:17pm, and again at 7:17pm, and neither
one happened. Twice." The Hermit: "Two mornings arrived and went unanswered. You
came back." The Sun: "Two acts finished, and the boundary you set is still
uncrossed." `boundaryNeedsTheWorld` ran for the first time — `requires_contact`
was null before the request and true after it, stored by the deployed function
from the model's answer about a boundary reading "sent to one named person who
could buy it". The trial row, its reason and the encounter stamp on day 3 were
all read back out of the database independently of the browser. verify-deploy
reports every file matching dist/.

What broke. A spent figure blocked the two behind it: the endpoint asked the
detector for "the trial", got the Devil, saw the cycle was already done with him
and stopped — and since two filed misses never leave the record, that repeats
every day forever with the Hermit and the Sun unreachable behind him for the
rest of the cycle. The used set now goes into the detector rather than being
checked on the way out. Found by working out what a second week looks like; every
test until then had used a fresh cycle. Also: the live fixture wrote a completed
day with no `what_happened` and production refused it on the `filing_requires_text`
check constraint — a real invariant the in-memory fixture did not know about, and
an argument for the live pass existing at all. And `probe-session` waited thirty
seconds for supabase's default `sb-<ref>-auth-token` on a page that was signed in;
the client is configured with its own storageKey, `sovrn_auth`. Lastly I pushed
the first commit to `legacy`, an abandoned August repo, rather than `origin` —
rejected as non-fast-forward, which is the only reason I noticed.

Open. The orphan sweep cleared 20 empty anonymous accounts and twelve of them
were created inside the five-minute window where Part 1's probes were running,
so a single probe run is leaving more than one account behind: `probe()` records
the identity minted on first load and deletes that one, and anything minted later
in the run is not recorded and not cleaned. The structural fix from last time
only covers the first account. Accounts now stand at 18, with 22 entries, 11
cycles and no trials.
