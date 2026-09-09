import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { EASE, T, prefersReducedMotion } from '../lib/motion';

interface Props {
  /** Set to run the dissolve. Until then the square holds. */
  name: string | null;
  /* Seconds for the square to fill from outline to solid. 0 means it is already
     solid — day 7 opens on a finished mark, not a filling one. */
  fillDuration?: number;
  breathe?: boolean;
  size?: string;
  dissolve?: number;
  nameDelay?: number;
  nameFade?: number;
  nameSize?: string;
}

/* The mark, and the one motion the product owns.

   The square opens and the name arrives where it was. It happens twice: at the
   end of a generation, and on day 7 when the becoming stops reading "in
   progress". Both are the same movement on purpose — the second is supposed to
   rhyme with the first — so it lives in one component rather than being written
   out twice and drifting apart.

   GSAP drives it. The fill is a single 20-second linear tween rather than a
   per-frame state write, which means it is a clock the component can read,
   interrupt and finish early when the reading actually lands.

   DESIGN_FROZEN.md: cream ground, black, Geist Sans, no cosmic imagery. Under
   prefers-reduced-motion nothing scales and nothing repeats — the fill renders
   as one frozen frame and the name cross-fades in its place. */
export default function SquareReveal({
  name,
  fillDuration = 0,
  breathe = false,
  size = 'clamp(132px, 42vw, 180px)',
  dissolve = T.square.dissolve,
  nameDelay = T.square.nameDelay,
  nameFade = T.square.nameFade,
  nameSize = 'clamp(38px, 11.5vw, 60px)',
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const breathEl = useRef<HTMLDivElement>(null);
  const squareEl = useRef<HTMLDivElement>(null);
  const fillEl = useRef<HTMLDivElement>(null);
  const nameEl = useRef<HTMLDivElement>(null);
  const fillTween = useRef<gsap.core.Tween | null>(null);

  /* The wait: breathing, and the fill running as a clock. */
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      if (fillDuration > 0) {
        if (reduced) {
          gsap.set(fillEl.current, { height: `${T.square.staticFill * 100}%` });
        } else {
          fillTween.current = gsap.to(fillEl.current, {
            height: '100%',
            duration: fillDuration,
            ease: EASE.linear,
          });
        }
      } else {
        gsap.set(fillEl.current, { height: '100%' });
      }

      if (breathe && !reduced) {
        gsap.to(breathEl.current, {
          scale: T.square.breatheScale,
          duration: T.square.breatheCycle / 2,
          ease: EASE.breath,
          yoyo: true,
          repeat: -1,
        });
      }
    }, root);
    return () => ctx.revert();
  }, [fillDuration, breathe]);

  /* The arrival. */
  useEffect(() => {
    if (!name) return;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      fillTween.current?.kill();

      const tl = gsap.timeline();
      // Whatever the clock reached, finish it — the reading is here.
      tl.to(fillEl.current, {
        height: '100%',
        duration: reduced ? 0 : T.square.fillCatchUp,
        ease: EASE.in,
      }, 0);

      if (reduced) {
        // No scaling, no repeating: the square goes, the name takes its place.
        tl.to(squareEl.current, { opacity: 0, duration: nameFade, ease: EASE.in }, 0);
        tl.fromTo(nameEl.current, { opacity: 0 }, { opacity: 1, duration: nameFade, ease: EASE.in }, 0);
      } else {
        gsap.killTweensOf(breathEl.current);
        tl.to(breathEl.current, { scale: 1, duration: 0.2, ease: EASE.in }, 0);
        tl.to(squareEl.current, {
          scale: 1.5, opacity: 0, duration: dissolve, ease: EASE.out,
        }, 0);
        tl.fromTo(nameEl.current,
          { opacity: 0 },
          { opacity: 1, duration: nameFade, ease: EASE.in },
          nameDelay);
      }
    }, root);
    return () => ctx.revert();
  }, [name, dissolve, nameDelay, nameFade]);

  return (
    <div ref={root} style={{ position: 'relative', width: size, height: size }}>
      <div ref={breathEl} style={{ width: '100%', height: '100%' }}>
        <div
          ref={squareEl}
          aria-hidden="true"
          style={{
            width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
            border: '2px solid #000000', background: '#FBFAF7', boxSizing: 'border-box',
          }}
        >
          {/* Fills from the bottom. Outline and cream interior at zero, solid
              black at one. */}
          <div
            ref={fillEl}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 0, background: '#000000' }}
          />
        </div>
      </div>

      {name && (
        <div
          ref={nameEl}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw', maxWidth: 560, opacity: 0,
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: nameSize, lineHeight: 1.04,
            letterSpacing: '0.01em', color: '#000000', textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
}
