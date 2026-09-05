import { markUrl } from './marks';

/* The shareable card.

   1080x1350 PNG, drawn client-side. Nothing on it came from anything the person
   typed: no answers, no birth data, no reading, no Ledger. Their mark, their
   becoming, one line under it, and the domain. It has to be safe to post without
   a second thought, so the safest possible rule is the one in force — user text
   never reaches this canvas at all. */

export const CARD = {
  width: 1080,
  height: 1350,
  paper: '#FBFAF7',
  ink: '#000000',
  muted: '#6E6A66',
  faint: '#9A9A9A',
  family: "'Geist', Inter, sans-serif",
} as const;

export const LAYOUT = {
  mark: { size: 300, top: 300 },
  /* The name is the thumbnail. At 1080 wide a 112px cap height still reads when
     the whole card is 200px in a feed, which is the only size most people will
     ever see it at. */
  name: { baseline: 800, maxWidth: 900, maxSize: 112, minSize: 54, tracking: 0.015 },
  sub: { baseline: 872, size: 38 },
  footer: { baseline: 1256, size: 26, tracking: 0.08 },
} as const;

export const FOOTER_TEXT = 'sovrn.online';

export interface CardContent {
  becoming: string;
  /** The loop line, or the date it resolved. Null draws nothing. */
  sub: string | null;
}

/** The reveal card: the becoming, and the loop they are running right now. */
export function blueprintCard(becoming: string, loop?: string | null): CardContent {
  const name = (becoming ?? '').trim().toUpperCase();
  const l = (loop ?? '').trim();
  return { becoming: name, sub: l ? `Right now you're the ${l}.` : null };
}

/**
 * The day 7 card: no loop line.
 *
 * The becoming has resolved, so naming what they were running instead would be
 * describing a week that is now closed. The date is what replaces it.
 */
export function daySevenCard(becoming: string, earnedAt: Date): CardContent {
  const name = (becoming ?? '').trim().toUpperCase();
  let when: string;
  try {
    when = new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(earnedAt);
  } catch {
    when = '';
  }
  return { becoming: name, sub: when || null };
}

/**
 * Largest size at or below maxSize whose text fits maxWidth.
 *
 * Takes a measuring function rather than a canvas so the fitting logic can be
 * tested without a browser. Text width is near-linear in font size, so the first
 * estimate is usually right and the walk-down is a correction, not a search.
 */
export function fitFontSize(
  measureAt: (size: number) => number,
  maxWidth: number,
  maxSize: number,
  minSize: number
): number {
  const atMax = measureAt(maxSize);
  if (atMax <= maxWidth) return maxSize;
  let size = Math.max(minSize, Math.floor((maxSize * maxWidth) / atMax));
  while (size > minSize && measureAt(size) > maxWidth) size -= 1;
  return size;
}

type Ctx = CanvasRenderingContext2D;

function trackedWidth(ctx: Ctx, text: string, tracking: number, size: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width;
  return w + tracking * size * Math.max(0, [...text].length - 1);
}

/* Canvas has no letter-spacing that Safari can be relied on for, so tracked type
   is drawn a character at a time. Kerning is lost, which is the correct trade for
   tracked uppercase display type — the tracking removes the pairs anyway. */
function drawTracked(
  ctx: Ctx, text: string, centerX: number, baseline: number, tracking: number, size: number
): void {
  const extra = tracking * size;
  let x = centerX - trackedWidth(ctx, text, tracking, size) / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, baseline);
    x += ctx.measureText(ch).width + extra;
  }
}

/**
 * Paint the card. `mark` is the archetype SVG, or null for the solid square.
 *
 * The canvas must already be sized to CARD.width x CARD.height — the export is
 * exactly the backing store, so the dimensions are not negotiable here.
 */
export function drawCard(ctx: Ctx, content: CardContent, mark: CanvasImageSource | null): void {
  const cx = CARD.width / 2;

  ctx.fillStyle = CARD.paper;
  ctx.fillRect(0, 0, CARD.width, CARD.height);

  const { size, top } = LAYOUT.mark;
  ctx.fillStyle = CARD.ink;
  if (mark) ctx.drawImage(mark, cx - size / 2, top, size, size);
  else ctx.fillRect(cx - size / 2, top, size, size);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const measureName = (s: number) => {
    ctx.font = `300 ${s}px ${CARD.family}`;
    return trackedWidth(ctx, content.becoming, LAYOUT.name.tracking, s);
  };
  const nameSize = fitFontSize(
    measureName, LAYOUT.name.maxWidth, LAYOUT.name.maxSize, LAYOUT.name.minSize
  );
  ctx.font = `300 ${nameSize}px ${CARD.family}`;
  ctx.fillStyle = CARD.ink;
  drawTracked(ctx, content.becoming, cx, LAYOUT.name.baseline, LAYOUT.name.tracking, nameSize);

  if (content.sub) {
    ctx.font = `300 ${LAYOUT.sub.size}px ${CARD.family}`;
    ctx.fillStyle = CARD.muted;
    ctx.textAlign = 'center';
    ctx.fillText(content.sub, cx, LAYOUT.sub.baseline);
    ctx.textAlign = 'left';
  }

  ctx.font = `400 ${LAYOUT.footer.size}px ${CARD.family}`;
  ctx.fillStyle = CARD.faint;
  drawTracked(ctx, FOOTER_TEXT, cx, LAYOUT.footer.baseline, LAYOUT.footer.tracking, LAYOUT.footer.size);
}

/**
 * Wait for Geist before measuring anything.
 *
 * Canvas does not wait for webfonts. Draw before the face is ready and the card
 * silently renders in the fallback at different metrics — which looks fine on
 * screen and wrong in the exported PNG, where nothing can be re-flowed.
 */
export async function ensureFonts(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return;
  try {
    await Promise.all([
      fonts.load(`300 ${LAYOUT.name.maxSize}px Geist`),
      fonts.load(`300 ${LAYOUT.sub.size}px Geist`),
      fonts.load(`400 ${LAYOUT.footer.size}px Geist`),
    ]);
    await fonts.ready;
  } catch {
    /* Draw anyway. A card in the fallback face beats no card. */
  }
}

/** The archetype mark, or null when the art does not exist yet. */
export function loadMark(becoming: string | null | undefined): Promise<HTMLImageElement | null> {
  const src = markUrl(becoming);
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export type SaveOutcome = 'shared' | 'downloaded' | 'opened' | 'cancelled';

/**
 * Get the PNG onto the person's device.
 *
 * Share sheet first, and not as a nicety: iOS Safari ignores the download
 * attribute on a blob URL and navigates to it instead, so the anchor route ends
 * with the card replacing the page and no file saved. The share sheet is the
 * only dependable save path there, and it is also the one people actually want,
 * because the next thing they do is post it.
 */
export async function saveCard(canvas: HTMLCanvasElement, filename: string): Promise<SaveOutcome> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Card could not be rendered');

  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (err) {
      // Dismissing the sheet is a choice, not a failure.
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      /* Anything else falls through to the download path. */
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'downloaded';
  } finally {
    // Late enough that the download has started, early enough not to leak.
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }
}
