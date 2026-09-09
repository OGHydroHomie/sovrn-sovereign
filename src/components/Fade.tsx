import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';
import { EASE, prefersReducedMotion } from '../lib/motion';

interface Props {
  children: ReactNode;
  /** Seconds. */
  duration?: number;
  delay?: number;
  /** Px to rise from. 0 is a pure cross-fade. */
  y?: number;
  style?: CSSProperties;
}

/* Fade in on mount.

   This replaces framer-motion's AnimatePresence at the page level, and it is
   deliberately smaller than what it replaces: it animates entrances, not exits.
   The pages it swaps between all sit on the same cream ground and the old one is
   gone in the same frame the new one starts, so what a person sees is a fade up
   from paper rather than a cut. Keeping exit animations would mean holding an
   unmounted page alive to animate it, which is most of AnimatePresence and all
   of its weight. */
export default function Fade({ children, duration = 0.4, delay = 0, y = 0, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { opacity: 0, y: reduced ? 0 : y },
        {
          opacity: 1, y: 0,
          duration: reduced ? 0.01 : duration,
          delay: reduced ? 0 : delay,
          ease: EASE.in,
        });
    }, ref);
    return () => ctx.revert();
  }, [duration, delay, y]);

  return <div ref={ref} style={{ opacity: 0, ...style }}>{children}</div>;
}

/**
 * Fade an existing element to a state, rather than on mount.
 *
 * For the two places where opacity follows a value: the loading caption going
 * out as the name arrives, and the day 7 record coming up behind it.
 */
export function useFadeTo(
  ref: React.RefObject<HTMLElement | null>,
  show: boolean,
  duration = 0.4
): void {
  useEffect(() => {
    if (!ref.current) return;
    const reduced = prefersReducedMotion();
    const tween = gsap.to(ref.current, {
      opacity: show ? 1 : 0,
      duration: reduced ? 0.01 : duration,
      ease: EASE.in,
    });
    return () => { tween.kill(); };
  }, [ref, show, duration]);
}
