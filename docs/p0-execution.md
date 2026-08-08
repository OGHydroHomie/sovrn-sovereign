# SOVRN P0 Execution

This document defines the immediate engineering work required to ship the Minimum Phenomenal Product.

Do not broaden scope beyond these tickets.

---

## P0-01 — Blueprint Prompt Fidelity

### Goal

Remove contradictions and incentives for hallucinated certainty from `api/generate.ts`.

### Requirements

- Remove any global requirement that every statement cite an astrological placement.
- Response requirements must adapt when houses, angles, or Rising sign are unverified.
- Never require a Rising interpretation when Rising is not verified.
- Replace "root cause" with "underlying mechanism" or equivalent non-clinical wording.
- Remove ancestral-healing and Kabbalistic framing from V1 generation.
- Do not force FEAR → Saturn / South Node / 12th house mappings.
- Do not force DESIRE → Jupiter / MC / North Node mappings.
- Do not force REPEATING PATTERN → hard aspects / retrogrades / South Node mappings.
- These factors may be used only when they meaningfully increase explanatory specificity.
- Never manufacture astrological justification for a conclusion.
- Preserve deterministic chart-only rules.
- Add an explicit prompt-injection boundary around user-provided personal data.
- Preserve existing streaming behavior.

### Definition of Done

The API works operationally as before, but the interpretation contract is safer, more grounded, and less likely to manufacture certainty.

---

## P0-02 — Chart Verification

### Goal

Audit `chart.ts` for deterministic correctness.

### Verify

- birth date parsing
- birth time handling
- unknown birth-time behavior
- timezone handling
- daylight-saving handling
- UTC conversion
- latitude / longitude
- planetary positions
- exact degrees
- North / South Node calculation
- Ascendant
- Midheaven
- Whole Sign house assignment
- aspects
- retrograde status if used

### Definition of Done

Known reference charts match trusted external reference values within reasonable tolerances.

No generated interpretation may assert an unverified angle or house.

---

## P0-03 — Calibration

### Goal

Let the user verify the Shadow Pattern without SOVRN arguing with them.

Immediately after the Shadow Pattern display:

- THAT HIT
- PARTLY
- NOT ME

### Persist

- anonymous session ID
- blueprint / prompt version if available
- calibration response
- timestamp

### Rules

- Never argue with the user.
- "Not me" is product data, not user failure.
- Do not attempt an automatic re-interpretation in V0 unless explicitly approved.

---

## P0-04 — Sovereign Act Commitment

### Goal

Turn revelation into agency.

After the generated Sovereign Act, provide one primary CTA:

I COMMIT

### Persist

- commitment state
- timestamp
- anonymous session ID

### Sovereign Act Quality Standard

The act must be:

- specific
- observable
- uncomfortable-but-reasonable
- achievable within 24 hours
- directly connected to the identified pattern

BAD:
"Practice believing in yourself."

GOOD:
"Send the proposal by 2 PM without making another formatting pass."

---

## P0-05 — Analytics

### Goal

Measure the MPP funnel without exporting intimate user content.

Track:

- landing_viewed
- blueprint_started
- birth_data_completed
- architecture_viewed
- mirror_completed
- blueprint_generation_started
- blueprint_generated
- shadow_viewed
- shadow_calibrated
- sovereign_act_viewed
- sovereign_act_committed
- share_clicked
- save_requested
- evidence_returned
- evidence_logged

### Privacy Rule

Never send these to analytics:

- deepest fear text
- desired-reality text
- repeating-pattern text
- full birth data
- Blueprint prose
- Shadow Pattern prose
- private Evidence Ledger text
- email address unless explicitly required and approved

Use anonymous IDs and behavioral events.

---

## P0-06 — Security / Cost Protection

### Goal

Prevent uncontrolled public usage of paid AI infrastructure.

Review:

- public API exposure
- input length limits
- basic rate limiting
- abuse / bot protection
- request logging
- Anthropic budget controls
- CORS assumptions
- handling of malformed requests

### Rule

CORS is not authentication and is not sufficient protection from automated server-to-server requests.

Do not log sensitive personal-answer content unnecessarily.

---

## P0-07 — Mobile Experience Fidelity

### Goal

Make the first-session golden path excellent at 375px.

Test:

Ceremony → Birth Architecture → Mirror → Generation → Blueprint → Shadow → Calibration → Sovereign Act → Commitment

Zero tolerance for:

- horizontal overflow
- broken viewport
- scroll jank
- clipped text
- accidental double CTAs
- keyboard obscuring input
- lost inputs
- broken loading state
- confusing navigation
- layout breakage with long generated output
- unreadable typography

### Design Principle

Ceremony for revelation.
Velocity for repetition.

Use animation to increase meaning, not delay comprehension.

---

## P0-08 — Blueprint Eval Suite

### Goal

Create a repeatable quality-control process for prompt changes.

Start with 8–12 meaningfully different test profiles.

Evaluate every generated Blueprint on:

1. Specificity
2. Grounding
3. Mechanism
4. Novelty
5. Calibration
6. Actionability
7. Emotional impact

### Core Questions

- Could this reasonably have been shown to almost anyone?
- Can important claims be traced to real user inputs or verified chart information?
- Does it explain a mechanism rather than merely label a trait?
- Does it reveal something beyond paraphrasing what the user already said?
- Does it acknowledge weak evidence rather than pretending certainty?
- Does the Sovereign Act directly oppose the identified pattern?
- Does it create recognition without manufacturing pathology?

Do not approve a prompt change that materially regresses the evaluation set.

---

# EXECUTION ORDER

P0-01 Prompt Fidelity
↓
P0-02 Chart Verification
↓
P0-03 Calibration
↓
P0-04 Commitment
↓
P0-05 Analytics
↓
P0-06 Security / Cost Protection
↓
P0-07 Mobile Fidelity
↓
P0-08 Blueprint Eval Suite

TEST → COMMIT → NEXT TICKET.

Never implement multiple P0 tickets in one uncontrolled change.
