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

- Square, with BOTH a viewBox and intrinsic dimensions:
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">`.
  The viewBox alone is enough for an `<img>`, but a dimensionless SVG drawn into
  a canvas rasterises at zero in some browsers, and the card is a canvas export.
  Both surfaces scale it explicitly, so the intrinsic size is only a base.
- Greyscale. Black through mid-grey is fine — the delivered set is shaded
  illustration rather than pure line art, and flattening it to a single ink
  would wreck the drawings. No colour: no gold, no purple, no gradients, no
  cosmic imagery. DESIGN_FROZEN's killed palette still applies.
- Transparent background. The cream comes from the page underneath.
- Legible at 96px and up. The marks appear on the Blueprint reveal at 220-280px
  and on the share card at 300px. They are NOT used in the Ledger header, which
  keeps the solid square: at that size a shaded illustration is a smudge, and
  that line is a label rather than a portrait.
- No embedded text, no fonts — the card draws these into a canvas, and an SVG
  that depends on a font will not render the same there.
- No C2PA or XMP metadata. The generator embeds a provenance manifest that is
  roughly half the file, and these are shipped to every visitor on every load.
  Strip `<metadata>` and the `xmlns:c2pa` attribute before committing.
- No external references of any kind. The card canvas is exported as a PNG, and
  a remote reference would either fail to load or taint the canvas and break the
  export outright.
