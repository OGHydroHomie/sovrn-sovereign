Any visual change to shipped surfaces during September requires a written reason before the commit.

# DESIGN FROZEN

Effective for the September public launch. This document governs every shipped surface.
It is a freeze, not a style guide: the decisions below are already made and are not
reopened by taste, by a new reference, or by a better idea.

## Scope

"Shipped surfaces" means anything a user can reach in production — pages, components,
generated PDFs, emails, and the favicon. A change is "visual" if it alters color,
typeface, weight, spacing, imagery, motion, or layout.

Changing any of these requires a written reason recorded before the commit that makes
the change. The reason goes in the commit body. No reason, no commit.

## Palette

- **Background:** cream / paper-white. The page is paper. It is never dark, never
  gradient, never tinted toward another hue.
- **Foreground:** black line art. Rules, borders, diagrams, and illustration are drawn
  as black lines on the paper.
- **Prohibited: gold.** Any metallic, amber, brass, or yellow accent.
- **Prohibited: purple.** Any violet, indigo, magenta, or lavender.

## Typography

- **Geist Sans only.** Inter is the sole fallback in the font stack. Nothing else.
- **No display font.** There is no second typeface for headings, quotes, wordmarks, or
  numerals. Display sizes are Geist Sans set large.
- **Five weights, and only these five:** 100, 300, 400, 500, 700.
- **Weight 100 is display-only.** It is permitted at display sizes and nowhere else. It
  is never used for body text, labels, captions, buttons, form fields, or any text a
  user is expected to read at length.

## Imagery

- **No cosmic imagery.** No starfields, nebulae, constellations, orbital rings, zodiac
  wheels, planetary glyphs, celestial gradients, or night-sky backdrops.
- Illustration is black line art on paper, or there is no illustration.

## How to change something anyway

1. Write the reason: what is broken, for whom, and why the freeze is the cause.
2. Put that reason in the commit body of the commit that makes the change.
3. Commit the change on its own, separate from unrelated work.

A reason is a defect or a launch blocker. A reason is not "this looks better."
