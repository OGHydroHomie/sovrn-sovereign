# SOVRN — Art Direction Constitution

This document is the visual and experiential source of truth for SOVRN.

Where this document and any other design note disagree, this document wins.
It governs new work. It does not retroactively condemn shipped screens; it
defines what they migrate toward.

---

## 0. THESIS

Luxury editorial × ancient intelligence × precision instrument × prestige video game.

The product should feel like:

> An artifact from a highly sophisticated hidden order that happens to run on
> modern technology.

Not a mystical app with a nice font. An instrument, built by people who knew
exactly what they were doing, that happens to read something true about you.

### Core emotional arc

Mystery → Precision → Recognition → Confrontation → Expansion → Agency → Evidence

Every screen occupies exactly one position on that arc. If a screen is doing two
jobs, it is two screens.

### Core product doctrine

SEE THE PATTERN.
CHOOSE DIFFERENTLY.
PROVE IT.

---

## 1. MATERIAL

### Palette

| Token | Hex | Role |
|---|---|---|
| Canvas | `#070A0F` | The void. Base of every dark surface. |
| Elevated surface | `#0D1118` | Anything nearer than the canvas. |
| Bone / ivory | `#EEE9DF` | Primary text. The voice. |
| Sovereign gold | `#C4A36A` | Revelation, sovereignty, commitment, earned progress. |
| Shadow ember | `#C65A3E` | Shadow, friction, interruption, consequence. |

Derived values are permitted only as opacity steps of the five above. No new
hues. Bone at 60% is the secondary text colour; bone at 30% is metadata; bone at
8–12% is a hairline. Gold and ember never appear below 100% saturation as a
"tint background."

### Semantic colour law

- **Gold is earned, never decorative.** Gold marks the moment something is
  revealed, chosen, or completed. A gold element that appears before the user
  has done anything is a lie.
- **Gold has two intensities.** *Latent* gold is potential not yet claimed —
  low-intensity, never above ~40% opacity, never a fill, only light. *Full*
  gold is saturated and is reserved for earned revelation, commitment, and
  evidence.
- **The Threshold seam is the sole pre-action exception.** At the Threshold,
  gold may appear only as latent, revealed potential — the light behind the
  seal. It is restrained and low-intensity until the user acts. Nowhere else in
  the product may gold precede an action.
- **Ember is consequence.** Ember marks the shadow, the cost, the interruption,
  the thing that will happen if nothing changes. Ember is never a "primary
  button colour" chosen for contrast.
- **Bone carries the language.** Almost everything is bone at some opacity.
- **Canvas is not a background. It is depth.** Treat it as distance, not fill.

### Typography

**Fraunces** — revelations, archetype titles, Shadow moments, hero quotes.
The Oracle's voice. Used large, used rarely, given room.

**Space Grotesk** — controls, metadata, coordinates, labels, utility UI, and the
doctrine lines. The instrument's voice. Uppercase, tracked `0.12em`–`0.24em`,
small. It never tries to be beautiful; it tries to be exact.

Georgia remains the body serif for long-form blueprint prose.

The two typefaces must never compete inside one block. Fraunces states; Space
Grotesk labels. If a Fraunces line needs a Space Grotesk line to explain it, the
Fraunces line is not finished.

### Grain, light, depth

- **Grain** is mandatory on dark surfaces at 2–4% opacity, static, non-animated.
  It is what separates "expensive black" from "#000 div."
- **Light is directional and singular.** One source per composition. Usually
  from the aperture, occasionally from above. Never ambient glow on all sides.
- **Depth is built from value, not blur.** Layers separate by luminance and
  scale, not by frosted glass.
- **Vignette** is permitted and encouraged, always radial, always ≤ 40%.

---

## 2. EXPERIENCE LAWS

1. One revelation per viewport.
2. Slow when revealing. Fast when operating.
3. Ceremony for revelation. Velocity for repetition.
4. The Oracle speaks loudly. The interface whispers.
5. Nothing looks mystical unless it also looks precise.
6. SOVRN never looks like generic astrology, meditation, crypto, AI SaaS, or
   metaphysical software.
7. Avoid excessive glassmorphism, purple gradients, stars, zodiac wallpaper,
   glowing cards, and generic mystical iconography.
8. Negative space is part of the experience.
9. Returning users never replay the full opening ceremony.
10. Design mobile-first at 375px.

---

## 3. MOTION GRAMMAR

| Class | Duration | Easing | Use |
|---|---|---|---|
| Utility | 150–200ms | `ease-out` | Taps, toggles, field focus, hover |
| Navigation | 250–400ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Screen to screen |
| Major revelation | 600–1000ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Archetype, Shadow, quote |
| Threshold ceremony | 8–12s **maximum**, interruptible | staged | First use only |

Motion is deliberate, tactile, restrained, expensive. Things move as if they have
mass and were machined to tolerance.

Prohibited: bounce, elastic, spring overshoot, parallax on scroll, anything that
loops forever inside the user's field of attention, and any animation that
delays comprehension rather than creating it.

The breathing-pulse CTA currently in `index.css` is a violation of this grammar
and is deprecated for new surfaces.

---

## 4. SOUND

Optional and sparse. Low-frequency, tactile, ritualistic — a seal releasing, a
mechanism seating, a single sub-bass impact at the moment of passage.

Never ambient spa music. Never chimes, singing bowls, or wind.

**Launch may remain silent.** If sound ships, it is opt-in, defaults off, and
the experience must be complete without it.

---

# PART II — THE THRESHOLD

The first-use entrance is the highest-priority surface in the product. It is the
only moment where SOVRN gets to establish that it is not what the user assumes
it is.

## 5. CONCEPT

The user approaches and enters a **sealed architectural aperture** — a seam in a
monolithic face that parts to admit them.

Ancient-futurist. Monolithic. Architectural. Restrained. Precise. Mysterious.
Expensive.

Think less "door as object" and more "aperture as mechanism." There is no frame,
no panel, no handle, no hinge, no arch. There is a vast dark face, a seam of
light, and a seal.

**It must NOT read as:** a fantasy castle door, a generic glowing portal, a
meditation app, a sci-fi game menu, a purple cosmic vortex, zodiac wallpaper, an
ornate occult temple, or decorative 3D for its own sake.

## 6. TECHNIQUE — CSS/SVG FIRST

**True 3D is not required and should not be used for V1.**

The entire effect is achievable with: layered absolutely-positioned divs, CSS
radial and linear gradients, `transform: scaleX/scaleY/translate`, `opacity`,
`filter: blur()` on ≤ 2 elements, one inline SVG for the seal, one tiling grain
image or SVG `feTurbulence`, and `will-change: transform, opacity`.

Everything animates on **transform and opacity only** — the two GPU-composited
properties. No layout-affecting animation. No canvas. No WebGL. No Spline.

The repository already carries `three`, `@types/three`, and `gsap` as
dependencies, and `src/components/ThreeBackground.tsx` and
`src/components/StarField.tsx` are **imported nowhere**. The Threshold does not
revive them. 3D may be revisited only if a measured V1 proves the CSS ceiling is
the limiting factor — not before.

Performance contract: 60fps on a mid-tier phone at 375px; no layout thrash; the
composition is ≤ 8 animated elements; total added weight under ~6KB gzipped
excluding the grain asset.

## 7. THRESHOLD VISUAL COMPOSITION

### Layer stack (back to front)

| # | Layer | Description |
|---|---|---|
| 0 | Void | `#070A0F` flat fill. |
| 1 | Depth field | Very low-contrast radial, centred, `#0D1118` at ~50% fading to transparent by 70% radius. Suggests a face, not a wall. |
| 2 | Aperture glow | Vertical elliptical radial in gold at 5–8%, tall and narrow, centred on the seam. This is the only light source. |
| 3 | Seam | The aperture proper. A 1px-wide vertical bar of gold at *latent* intensity, ~34–42% of viewport height, centred, with a 12–16px blur bloom sibling at ~25% opacity. Latent ceiling: the seam never exceeds 40% gold before the user acts. |
| 4 | Seal | The SOVRN mark, centred on the seam's midpoint. See §8. |
| 5 | Type well | Fixed-position line of doctrine type, below the seal, single slot. |
| 6 | Grain | Full-bleed tiling noise at 3%, `pointer-events: none`, never animated. |
| 7 | Vignette | Radial, edges to 35% black. |

### Closed state

Near-total darkness. The seam reads as a hairline of light in a surface you
cannot see the edges of. The seal sits on the seam like a lock seated in a slot.
Nothing pulses. Nothing drifts. The composition is **still** — stillness is what
makes the eventual movement expensive.

At rest the seam is ~1px wide. It should feel like pressure behind a wall.

### Opening state

The seal parts along the vertical axis. Its two halves translate outward 10–14px
and fade to zero over ~500ms. The seam then widens — `scaleX` on the seam and
its bloom — from 1px to roughly 40% of viewport width over ~900ms, easing
`cubic-bezier(0.16, 1, 0.3, 1)`.

As the slot widens, layer 2's gold rises from 6% to ~14%, and a second depth
plane behind the seam becomes faintly legible: graded warmth at the floor of the
slot, no scene, no content, no stars. Depth, not a room.

**Passage** is the slot continuing to expand past the viewport edges — `scaleX`
to ~14× combined with a subtle `scale` on the whole composition — while opacity
of layers 0–4 falls. The user does not watch a camera fly through a door. The
aperture consumes the frame, and what is behind it is the next screen. Total
passage ~700ms.

## 8. ROLE OF THE SOVRN MARK

**The mark is the mechanism, not an ornament.** It functions as the seal that
holds the aperture closed, and its parting is what opens the Threshold.

SOVRN currently has a wordmark only — the letters `SOVRN` in tracked caps. There
is no emblem. Until an emblem exists, the Threshold uses a **provisional
geometric seal**, defined here so implementation is unblocked and replacement is
trivial:

- A thin ring — 1px stroke, bone at 22%, ~44px diameter at 375px.
- Bisected vertically by the seam, which passes through it in gold.
- Four short registration ticks at the cardinal points, 3px, bone at 14% —
  the marks of an instrument, not a rune.
- On opening, the ring splits at 12 and 6 o'clock; halves translate apart and
  fade; the ticks fade first.

The seal is drawn as **one inline SVG** with two `<path>` halves so each can
transform independently.

Rules that outlive the provisional form:

- The mark never rotates. Rotation reads as loading, occult, or crypto.
- The mark never glows on its own. It is lit by the seam.
- The mark is never larger than ~12% of viewport width at 375px.
- The wordmark `SOVRN` and the seal never appear at the same scale in the same
  frame; one is dominant.
- When the real emblem arrives, it inherits this role verbatim: seal, lock, key,
  aperture. Not a logo placed on a screen.

## 9. TYPOGRAPHY CHOREOGRAPHY

All three doctrine lines occupy the **same fixed slot** below the seal. They
replace one another. They never stack, never scroll, never accumulate.

Specification: Space Grotesk 600, 12px at 375px, uppercase, letter-spacing
`0.22em`, bone at 72%, centred, single line.

They are set in Space Grotesk — not Fraunces — deliberately. These lines are the
instrument's specification of what it does, not a poem. Fraunces here would make
SOVRN sound like it was asking to be believed.

| Beat | Line | In | Hold | Out |
|---|---|---|---|---|
| 1 | SEE THE PATTERN. | 400ms | 900ms | 300ms |
| 2 | CHOOSE DIFFERENTLY. | 400ms | 900ms | 300ms |
| 3 | PROVE IT. | 400ms | 1100ms | — (persists) |

Each line enters by opacity plus a 6px upward translate. No character-by-character
typing. No cursor. Typewriter effects are cliché and are prohibited on this screen.

`ENTER` is Space Grotesk 600, 13px, `0.20em` tracking, bone at 100%, inside a
48×minimum tap target bounded by a 1px bone hairline at 20%. On press the
hairline goes gold. `ENTER` is the only interactive element on the Threshold.

## 10. MOTION SEQUENCE

Target total: **~9.2s** unattended, within the 8–12s ceiling.

| t | Event |
|---|---|
| 0.0s | Void. Grain and vignette present at full. Nothing else. |
| 0.6s | Seam fades in to 1px, 40% gold. Depth field rises. |
| 1.2s | Seal fades in to 22%. |
| 2.0s | Beat 1 — SEE THE PATTERN. |
| 3.6s | Beat 2 — CHOOSE DIFFERENTLY. Seam brightens one step. |
| 5.2s | Beat 3 — PROVE IT. Aperture glow rises. |
| 6.6s | `ENTER` fades in beneath the doctrine slot. **Ceremony is now skippable-complete.** |
| — | Idle. Composition holds, fully still, indefinitely. |
| on tap | Seal parts (500ms) → seam widens (900ms) → passage (700ms) → Coordinates. |

### Interruption law

**Any tap anywhere, at any time, jumps immediately to the `ENTER`-present idle
state** (≤200ms cross-fade). A second tap enters. The ceremony is never a gate.

`ENTER` must be present and operable by **6.6s at the latest**. If instrumentation
later shows drop-off before that, the beats compress — the ceiling moves down,
never up.

## 11. TRANSITION INTO COORDINATES

This transition is the product's thesis in three seconds: **mystery becomes
precision.** It must be legible as a change of *register*, not just a change of
screen.

| Dimension | Threshold | Coordinates |
|---|---|---|
| Light | Single bloomed source | Flat, even, no bloom |
| Grain | 3% | 1.5% |
| Vignette | 35% | 0–10% |
| Alignment | Centred | Left-aligned |
| Type | Tracked caps, sparse | Labels, values, numerals |
| Gold | A seam of light | A progress rule and index numerals |
| Pace | 600–1000ms beats | 150–200ms responses |
| Feeling | "What am I about to enter?" | "This thing is measuring me." |

Mechanically: as the aperture consumes the frame, the incoming screen is already
mounted beneath it at `opacity: 0` with its hairline baseline grid and its
coordinate readout (`COORDINATES · 01 / 04`) drawn. Bloom is removed on the same
frame the slot passes the viewport edge. The first field is focusable within
400ms of passage completing.

Nothing about Coordinates is ceremonial. From here to the Calculation, the
product is fast.

## 12. REDUCED MOTION

`prefers-reduced-motion: reduce` receives a **composed still**, not a degraded
animation:

- Aperture rendered in its half-open state. Seal parted, static.
- All three doctrine lines omitted except `PROVE IT.`, which is present from
  first paint. The doctrine is not worth a sequence the user cannot perceive.
- `ENTER` present immediately at full opacity.
- Grain and vignette static (they already are).
- Transition to Coordinates is a ≤200ms opacity cross-fade. No scale, no
  translate, no passage.
- No `scaleX` animation of any kind.

This path must be a real code path, not `animation: none` applied to the full
sequence — a stalled ceremony is worse than no ceremony.

## 13. FIRST-VISIT AND RETURNING BEHAVIOUR

State lives in `localStorage`, alongside the existing `sovrn_*` keys in
`src/utils/storage.ts`.

| Condition | Behaviour |
|---|---|
| No `sovrn_threshold_seen`, no blueprint | Full ceremony. On `ENTER`, set the flag, go to Coordinates. |
| `sovrn_threshold_seen`, no blueprint | **Abbreviated threshold**: composed still, `PROVE IT.` and `ENTER` present from first paint, no beats. ~400ms total. |
| Saved blueprint exists | Skip the Threshold entirely. Land on a return state offering the existing blueprint and the next action. |
| Reduced motion | Composed still, per §12, regardless of visit count. |
| Deep link / dev `?screen=` | Threshold bypassed. |

Law 9 is absolute: **the full ceremony plays once.** A ritual that repeats is a
loading screen.

## 14. WHAT WOULD MAKE THE THRESHOLD FEEL CHEAP

Any one of these is disqualifying:

- A literal door: panels, frame, hinges, handle, arch, keyhole, stone texture.
- A rounded rectangle with a neon edge. That is a portal cliché, not an aperture.
- Purple, indigo, magenta, teal, or any gradient between two hues.
- Drifting particles, floating dust motes, twinkling stars, nebulae.
- Lens flare, god rays, anamorphic streaks, bloom beyond a soft 25%.
- The mark rotating, orbiting, pulsing, or breathing.
- Character-by-character typing, terminal cursors, "decrypting" text.
- Cinzel, Trajan, blackletter, or any typeface that signals "ancient" literally.
- Copy that addresses the user as "seeker," "traveller," or "chosen."
- Centred italic serif mystical aphorisms.
- Zodiac glyphs, constellations, planets, sacred geometry, mandalas, eyes.
- Glassmorphism panels floating in the void.
- Coloured drop shadows.
- Any ceremony the user cannot skip.
- A spinner or progress bar during the ceremony.
- Audio that plays without consent.
- More than one light source.
- Anything that makes the first tap feel slower than 200ms.

The test: if a competent competitor could ship the same screen in a week using a
stock shader and a Google Font, it is not SOVRN.

---

# PART III — STATE CONSTITUTION

Every state declares: emotion, density, typography, colour behaviour, motion
behaviour, and what must not happen.

## THRESHOLD

- **Emotion** — "What am I about to enter?"
- **Density** — Near-zero. One seam, one seal, one line, one action.
- **Typography** — Space Grotesk only. 12–13px. Tracked `0.20em`+.
- **Colour** — Canvas, bone at low opacity, one gold seam held at *latent*
  intensity (≤40%, light only, never a fill). Gold reaches full saturation only
  after the user acts. No ember.
- **Motion** — Staged ceremony ≤ 12s, interruptible, then perfectly still.
- **Must not** — Explain itself, sell, list features, scroll, or gate.

## COORDINATES

- **Emotion** — "This is an instrument, and it is precise."
- **Density** — Low. One field per viewport. Generous negative space.
- **Typography** — Space Grotesk labels and metadata; input value in bone at 16px+ (never below 16px — iOS zoom).
- **Colour** — Bone dominant. Gold only on the progress rule and the completed index.
- **Motion** — Utility class only, 150–200ms. Immediate response to every touch.
- **Must not** — Ceremony, decoration, celestial imagery, or a progress bar that starts at zero.

## MIRROR QUESTIONS

- **Emotion** — "No one has asked me this directly before."
- **Density** — One question per viewport. The question is the entire screen.
- **Typography** — Question in Fraunces, 24–28px, bone. Helper text in Space Grotesk, 13px, bone at 50%. The input is serif.
- **Colour** — Bone. Gold on progress only. Ember absent — the shadow is not named yet.
- **Motion** — 250–400ms between questions, horizontal translate. Never a slide carousel with visible neighbours.
- **Must not** — Crowd the viewport, show a word counter as pressure, validate harshly, or lose input on back-navigation.

## CALCULATION

- **Emotion** — "Something real is being computed."
- **Density** — Minimal. A status line and a single mechanism.
- **Typography** — Space Grotesk, 12px, tracked, bone at 60%. Status lines read as instrumentation, not affirmations.
- **Colour** — Canvas and bone. A single gold element indicating live work.
- **Motion** — One continuous, mechanical indicator. Deliberate, not bouncy.
- **Must not** — Fake progress percentages, spa language, spinning zodiac wheels, or claims that the AI is "channelling" anything.

## SOUL ARCHITECTURE

- **Emotion** — Recognition. "That is accurate, and I did not expect it to be."
- **Density** — One archetype per viewport. Long prose is chunked and paced.
- **Typography** — Archetype titles in Fraunces 700–800, 28–34px. Body in Georgia 16/1.7. Hero quote in Fraunces italic, 22–26px.
- **Colour** — Gold arrives here and is *earned*: archetype titles and the hero quote. Bone for prose.
- **Motion** — Major revelation class, 600–1000ms, staggered per section. Streaming text reveals at reading pace.
- **Must not** — Present three archetypes as three equal cards, use trait pills as decoration, or reveal everything at once.

## SHADOW PATTERN

- **Emotion** — Confrontation. Named, not judged.
- **Density** — The heaviest text block in the product, and still edited. One mechanism, four beats.
- **Typography** — Fraunces for the shadow quote. Georgia for the mechanism prose. No pills, no lists.
- **Colour** — **Ember's home.** The section rule, the quote, and the cost sentence carry ember. Gold is absent here — nothing has been earned yet.
- **Motion** — Slowest reveal in the product. The pattern → rule → behaviour → cost sequence may reveal in four beats.
- **Must not** — Diagnose, moralise, use red as alarm-UI, decorate the wound, or let the user scroll past without the cost registering.

## TRUE NORTH

- **Emotion** — Expansion. Air after pressure.
- **Density** — Deliberately the lightest section. Two paragraphs maximum.
- **Typography** — Georgia prose, one Fraunces line if a direction deserves it.
- **Colour** — Bone with gold returning quietly. Ember recedes entirely.
- **Motion** — A lift: content enters from below, slightly slower than navigation.
- **Must not** — Promise outcomes, predict wealth or fame, restate the chart, or become a second Soul Architecture.

## SOVEREIGN PATH

- **Emotion** — "There is a route, and it is walkable."
- **Density** — Structural. This is the only screen permitted to look like a sequence.
- **Typography** — Space Grotesk for step labels and indices; Georgia for the single line of substance per step.
- **Colour** — Gold marks completed and current; bone marks ahead. Ember marks the step where the shadow will resist.
- **Motion** — Navigation class. The path draws in once, then is static.
- **Must not** — Gamify, add streak counters, badges, confetti, or XP. Progress is evidence, not points.

## FIRST SOVEREIGN ACT

- **Emotion** — Agency, with the appropriate amount of discomfort.
- **Density** — One act. One viewport. No alternatives offered.
- **Typography** — The act itself in Fraunces, 22–26px — it is a revelation, not an instruction label. The reasoning in Georgia. The declaration in Fraunces italic on its own line.
- **Colour** — Gold on the act and the declaration. Ember only where the mechanism being interrupted is named.
- **Motion** — Single deliberate reveal. The act does not animate in pieces.
- **Must not** — Offer a menu, soften the act, add a checklist, or let the screen contain a second CTA.

## COMMITMENT

- **Emotion** — "I said I would."
- **Density** — One control. The most important tap in the product.
- **Typography** — `I COMMIT` in Space Grotesk 600, tracked. The instrument records; it does not celebrate.
- **Colour** — Gold at its most saturated moment in the entire experience. This is what gold has been saving itself for.
- **Motion** — A seating action: a short, weighted 200ms press with a definite end. Something closes.
- **Must not** — Confetti, checkmark animations, "Congratulations," social sharing prompts, or any reward theatre. Commitment is sober.

## RETURNING STATE

- **Emotion** — "It kept my record."
- **Density** — Low. What was committed, what is owed, one next action.
- **Typography** — Space Grotesk metadata forward; Fraunces only for the retained hero quote.
- **Colour** — Gold on evidence already earned. Ember if a commitment lapsed — stated, never scolding.
- **Motion** — Velocity, not ceremony. Under 400ms to usable.
- **Must not** — Replay the Threshold, re-reveal the blueprint from scratch, guilt the user, or reset progress.

---

# PART IV — REFERENCE

## SOVRN examples

- A machined instrument face: hairlines, registration ticks, exact numerals.
- Criterion / A24 title cards — restraint, weight, confidence in negative space.
- Monolith cinematography: one light source, vast dark, human scale implied.
- Swiss editorial layout applied to something that should not be Swiss.
- Prestige game main menus that use silence and a single mechanism (Inside, Death Stranding's UI, Returnal's diegetic readouts).
- Fine watch movement diagrams. Architectural section drawings. Survey markers.
- Luxury print: enormous margins, one image, one line of type, no explanation.

## NOT-SOVRN examples

- Co–Star's flat illustration and irony.
- The Pattern's rounded, pastel, wellness-adjacent softness.
- Calm / Headspace gradients, breathing circles, and soft edges.
- Crypto/AI SaaS: glassmorphic cards, neon gradient borders, animated mesh backgrounds.
- Purple nebula stock photography. Zodiac wheel graphics. Tarot iconography.
- Fantasy RPG doors, runes, glowing sigils.
- Notion-style productivity UI with a dark theme applied.
- Anything with an emoji in the interface.

## 375px mobile rules

- Primary viewport is **375px**. Design here first; scale up second.
- Horizontal padding 20px. Max content width 335px.
- Minimum tap target 48×48px, with 8px minimum between adjacent targets.
- Text inputs at 16px minimum — smaller triggers iOS zoom.
- Use `100svh`, never `100vh`, for full-height compositions.
- Zero horizontal overflow. Any wide element scrolls inside its own container.
- Never place two cards side by side. Stack always.
- Body copy no smaller than 15px; metadata no smaller than 11px.
- The keyboard must never obscure the active input or its primary action.
- Every full-viewport composition must survive a 640px-tall viewport with the
  keyboard open.

## First-time vs returning users

| | First time | Returning |
|---|---|---|
| Threshold | Full ceremony, once | Composed still, ~400ms, or skipped |
| Pace | Ceremony | Velocity |
| Revelation | Staged, slow | Already known — summarised, retrievable |
| Gold | Earned progressively | Already earned; shown as record |
| Priority | "What is this?" | "What do I do today?" |

The first session sells recognition. Every session after sells evidence. The
design must not confuse the two.

---

## 15. OPEN ITEMS

1. **The emblem does not exist.** §8 defines a provisional geometric seal so the
   Threshold can ship. The real mark should be commissioned against the role
   defined there, not designed as a logo and retrofitted.
2. **Palette migration.** This document's palette (`#070A0F`, `#EEE9DF`,
   `#C4A36A`, `#C65A3E`) supersedes the older Obsidian Oracle values still live
   in `src/index.css` and `docs/design-system.md` (`#0A0E1A`, `#F4F1EA`,
   `#E8B04B`, `#D93A2B`). New surfaces use this palette. Migration of existing
   screens is a separate, scheduled task — not a side effect of building the
   Threshold.
3. **Sound** is unspecified beyond §4 and out of scope for V1.
4. **The Sovereign Path state** is defined here ahead of its implementation and
   does not yet exist in the product.
