import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { EASE, T, prefersReducedMotion } from '../lib/motion';

interface Props {
  /** Rendered size of the wordmark. */
  size?: number;
  color?: string;
}

/* SOVRN, with the mark in place of the O.

   The square breathes on exactly the cycle and ease the loading square breathes
   on, because it is the same object: one signature appearing at the top of every
   page and again, large, while a reading is being written. Two different
   movements would make the second one a decoration.

   Nothing else moves. Under prefers-reduced-motion nothing moves at all — the
   square is still the mark, it is simply still.

   The square is aria-hidden and the link carries the name, so this reads as
   "SOVRN" rather than as "S VRN". */
export default function Wordmark({ size = 13, color = '#1A1A1A' }: Props) {
  const square = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !square.current) return;
    const ctx = gsap.context(() => {
      gsap.to(square.current, {
        scale: T.wordmark.breatheScale,
        duration: T.wordmark.breatheCycle / 2,
        ease: EASE.breath,
        yoyo: true,
        repeat: -1,
        transformOrigin: 'center center',
      });
    }, square);
    return () => ctx.revert();
  }, []);

  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: size,
        letterSpacing: '0.22em',
        fontWeight: 700,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      S
      <span
        ref={square}
        style={{
          display: 'inline-block',
          width: '0.62em',
          height: '0.62em',
          background: 'currentColor',
          /* Sits inside the cap height rather than on the baseline, so it reads
             as a letter in the word and not as a bullet between two of them. */
          verticalAlign: '0.03em',
          marginRight: '0.02em',
        }}
      />
      VRN
    </span>
  );
}
