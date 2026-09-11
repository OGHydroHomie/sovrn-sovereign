import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { EASE, T, prefersReducedMotion } from '../lib/motion';

interface Props {
  /** Rendered size of the wordmark. */
  size?: number;
  color?: string;
}

/* SOVRN, breathing on its tracking.

   The letters open from 0.15em to 0.45em and close again over five seconds. The
   mark itself does not move: no translate, no scale, no fade. Same sine ease as
   the loading square, slower because the travel is wider.

   The width is pinned before the animation starts. Letter-spacing changes the
   measured width of the text, so an unpinned wordmark would push everything
   beside it around the header twice every five seconds — the becoming name in
   the middle of the nav and the link on the right would both crawl. The element
   is measured once at its widest, that width is fixed, and the letters then
   breathe inside it.

   Measured after the webfont has settled, because Geist and the fallback are not
   the same width and pinning to the fallback would clip or float the real thing.

   Under prefers-reduced-motion it holds at 0.15em and never moves. */
export default function Wordmark({ size = 13, color = '#1A1A1A' }: Props) {
  const text = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = text.current;
    if (!el) return;
    let cancelled = false;

    const start = async () => {
      /* Pin to the widest state this will ever render at. */
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
      try { await fonts?.ready; } catch { /* measure anyway */ }
      if (cancelled || !text.current) return;

      const node = text.current;
      const previous = node.style.letterSpacing;
      node.style.letterSpacing = `${T.wordmark.trackingMax}em`;
      const widest = node.getBoundingClientRect().width;
      node.style.letterSpacing = previous;
      setWidth(Math.ceil(widest));

      if (prefersReducedMotion()) return;

      /* Tweened through a plain object and written out by hand: letterSpacing is
         not a transform, and driving it explicitly avoids depending on how a
         plugin chooses to interpolate a unit string. */
      const tracking = { em: T.wordmark.trackingMin };
      const tween = gsap.to(tracking, {
        em: T.wordmark.trackingMax,
        duration: T.wordmark.cycle / 2,
        ease: EASE.breath,
        yoyo: true,
        repeat: -1,
        onUpdate: () => {
          if (text.current) text.current.style.letterSpacing = `${tracking.em}em`;
        },
      });
      return () => tween.kill();
    };

    let cleanup: (() => void) | undefined;
    void start().then((fn) => { cleanup = fn; });
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  return (
    <span
      style={{
        display: 'inline-block',
        width: width ?? undefined,
        textAlign: 'center',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        ref={text}
        style={{
          display: 'inline-block',
          fontSize: size,
          fontWeight: 700,
          letterSpacing: `${T.wordmark.trackingMin}em`,
          color,
          whiteSpace: 'nowrap',
        }}
      >
        SOVRN
      </span>
    </span>
  );
}
