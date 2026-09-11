import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { EASE, T, prefersReducedMotion } from '../lib/motion';

interface Props {
  /** Rendered size of the wordmark. */
  size?: number;
  color?: string;
}

/* SOVRN, drifting.

   The whole mark rises three pixels and settles back over four seconds. That is
   the cycle and the ease the loading square breathes on — the tempo is what
   makes the two the same gesture, not the transform — so the header moves like
   the rest of the product rather than at its own speed.

   Nothing else. No fade, no scale, no colour, no hover.

   Under prefers-reduced-motion it does not move at all. */
export default function Wordmark({ size = 13, color = '#1A1A1A' }: Props) {
  const mark = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !mark.current) return;
    const ctx = gsap.context(() => {
      gsap.to(mark.current, {
        y: -T.wordmark.rise,
        duration: T.wordmark.cycle / 2,
        ease: EASE.breath,
        yoyo: true,
        repeat: -1,
      });
    }, mark);
    return () => ctx.revert();
  }, []);

  return (
    <span
      ref={mark}
      style={{
        display: 'inline-block',
        fontSize: size,
        letterSpacing: '0.22em',
        fontWeight: 700,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      SOVRN
    </span>
  );
}
