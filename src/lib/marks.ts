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

/* The crystallization frames: {slug}-x1 through {slug}-x6, near-chaos to
   resolved. x6 is byte-identical to {slug}.png, which is what makes the last
   frame and the settled mark the same picture rather than two that have to be
   kept in step.

   Six is the whole set. If the count ever changes, this constant and the files
   move together — nothing else counts frames. */
export const MARK_FRAMES = 6;

/** The six frames in order, or null if there is no becoming to name them for. */
export function markFrameUrls(becoming: string | null | undefined): string[] | null {
  const slug = markSlug(becoming ?? '');
  if (!slug) return null;
  return Array.from({ length: MARK_FRAMES }, (_, i) => `${MARK_DIR}/${slug}-x${i + 1}.${MARK_EXT}`);
}

/**
 * Fetch and decode every frame before anything animates.
 *
 * Resolves true only when all six are decoded and ready to paint. A stall
 * halfway through the crystallization is worse than not running it at all —
 * the sequence reads as one continuous event or it reads as broken — so the
 * caller is expected to fall back to the final frame on false.
 *
 * `decode()` rather than `onload` because a loaded image can still block the
 * first paint while the browser rasterises it, which is exactly the stall this
 * is meant to rule out.
 */
export async function preloadFrames(urls: string[], timeoutMs = 6000): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return false;

  const load = (src: string) => new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().then(() => resolve(true), () => resolve(true)) : resolve(true));
    img.onerror = () => resolve(false);
    img.src = src;
  });

  /* A slow connection must not hold the reading hostage. The reading is the
     thing they waited for; the animation is how it arrives. */
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  const all = Promise.all(urls.map(load)).then((r) => r.every(Boolean));
  return Promise.race([all, timeout]);
}
