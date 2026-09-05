# Archetype marks

One SVG per becoming, named for its slug. Drop the files in here and every
surface picks them up — the Blueprint reveal, the Ledger header and the
shareable card all resolve `/marks/{slug}.svg` at runtime. No code change.

Until a file exists, that becoming falls back to the solid black square.

## Filenames

    the-headliner.svg      the-negotiator.svg     the-founder.svg
    the-cornerstone.svg    the-clean-slate.svg    the-locksmith.svg
    the-closer.svg         the-curator.svg        the-host.svg
    the-bouncer.svg        the-lifeguard.svg
    the-conductor.svg      the-lighthouse.svg

The slug is derived from the name in `src/lib/marks.ts` — lowercase, non
alphanumerics collapsed to hyphens — so it is never written down twice.

## What the art has to be

DESIGN_FROZEN.md applies. Black line art on cream, nothing else.

- Square viewBox, `viewBox="0 0 100 100"`, no width/height attributes so the
  slot can size it.
- Stroke or fill in `#000000`. No gold, no purple, no gradients, no cosmic
  imagery.
- Transparent background. The cream comes from the page underneath.
- Legible at 28px in the Ledger header and at 300px on the card. If it needs
  detail to read, it is too detailed.
- No embedded text, no fonts — the card draws these into a canvas, and an SVG
  that depends on a font will not render the same there.
- No external references of any kind. The card canvas is exported as a PNG, and
  a remote reference would either fail to load or taint the canvas and break the
  export outright.
