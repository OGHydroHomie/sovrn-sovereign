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
/* The marks are raster now. They arrived as 896x1216 PNGs replacing the SVGs,
   so the extension moved with them — every mark 404'd and fell back to the
   square until it did. */
export const MARK_EXT = 'png';

/* Width over height, as delivered. The art is portrait, not square, and every
   slot that renders it was built for a square. */
export const MARK_ASPECT = 896 / 1216;

export function markUrl(becoming: string | null | undefined): string | null {
  const slug = markSlug(becoming ?? '');
  return slug ? `${MARK_DIR}/${slug}.${MARK_EXT}` : null;
}
