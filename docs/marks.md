# Archetype marks

The art spec. The SVGs themselves live in `public/marks/`; this file does not,
because everything under `public/` is served, and an internal spec on the open
web serves no one.

One SVG per becoming, named for its slug. Drop the files into `public/marks/`
and every surface picks them up — the Blueprint reveal, the Ledger header and the
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

---

# Trial cards

Three so far — `the-devil`, `the-hermit`, `the-sun` — and they are not becomings.
A becoming is who someone is and it never changes; a trial is where they are and
it ends. They share the directory and the slug rule and nothing else.

**Note on the spec above.** It describes the delivered set as SVG. It is not: the
marks in `public/marks/` are 1-bit PNGs at 1080×1620, processed from the source
art, and `MARK_EXT` in `src/lib/marks.ts` is `png`. The section above is kept
because the constraints it states — no colour, no text, no external references,
no C2PA metadata — all still hold. The format sentence does not.

## Files per trial card

    the-devil.png          the finished card, and frame x6 byte for byte
    the-devil-x1.png … -x6.png    the crystallization frames, near-chaos to resolved
    the-devil-freed.png    the same figure, unbound          ← this is what is missing

The first eight exist for all three figures. The ninth does not exist for any of
them, and until it does the unbinding runs without its one moving part: the card
sits still and the line and the act arrive on their beats around it.

## What `-freed` has to be

The same picture with the binding gone. Not a new drawing of the same character —
the same drawing, minus one thing.

- **Registered to the bound frame.** Same 1080×1620, same crop, same figure in
  exactly the same pixels. The transition measures where the two images disagree
  and treats the topmost disagreeing row as the top of the binding, so anything
  that moves the figure between the two frames reads as the whole picture
  sliding rather than the chain falling.
- **Only the binding differs.** For the Devil that is the chain and the weight it
  is attached to; for the others it is whatever holds them. Everything above the
  binding must be pixel-identical, because that is the region the sequence
  deliberately never touches.
- **Same treatment.** 1-bit, same dither, same density. A cleaner or heavier
  freed frame makes the figure appear to change material at the moment it is
  supposed to be unchanged.
- **Transparent background**, as with every other mark.
- **No inpainting smear where the binding was.** Whatever was behind it should be
  what is there — usually nothing.

Drop the file in `public/marks/` and it is picked up with no code change, the
same way every other mark is.
