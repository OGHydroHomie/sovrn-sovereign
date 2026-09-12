/* The thirteen becomings each get a mark. The art does not exist yet, so every
   surface that shows one falls back to the solid square — the slot is real now,
   the files drop in later without a code change. */

export const MARK_DIR = '/marks';

/**
 * File slug for a becoming. "THE CLEAN SLATE" -> "the-clean-slate".
 *
 * Derived from the name rather than kept in a lookup table, so a becoming can
 * never exist without a slug and the two cannot drift. The names come from a
 * closed list of thirteen, so the mapping is total.
 */
export function markSlug(becoming: string): string {
  return (becoming ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Where the mark lives, or null if there is no becoming to name one for. */
/* The marks are raster. They replaced the SVGs, so the extension moved with
   them — every mark 404'd and fell back to the square until it did. */
export const MARK_EXT = 'png';

/* 1080x1620: a true 2:3. The art is portrait and every slot that renders it was
   built for a square, so each surface constrains the axis that matters to it and
   lets the other follow this.

   The first raster set was 896x1216 (0.7368) and this is 0.6667 — close enough
   to look plausible and wrong enough to letterbox every mark on the site. It is
   written as the delivered dimensions rather than a decimal so the next set can
   be checked against it by eye. */
export const MARK_ASPECT = 1080 / 1620;

export function markUrl(becoming: string | null | undefined): string | null {
  const slug = markSlug(becoming ?? '');
  return slug ? `${MARK_DIR}/${slug}.${MARK_EXT}` : null;
}
