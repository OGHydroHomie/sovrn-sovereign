import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { EASE, T, prefersReducedMotion } from '../lib/motion';
import { MARK_ASPECT, MARK_FRAMES, markFrameUrls } from '../lib/marks';
import ArchetypeMark from './ArchetypeMark';

interface Props {
  becoming: string | null | undefined;
  /** Width of the card. Height follows the art's own 2:3. */
  size: number | string;
  /* True only when all six frames are already decoded and the sequence is
     wanted. The preload happens on the loading screen, before this ever mounts:
     frame one has to be on screen in the first paint of the reveal, and a
     component that starts fetching when it mounts cannot do that. False here
     means the finished mark, which is the fallback for every reason at once —
     a missing file, a slow network, reduced motion, a return visit. */
  ready: boolean;
}

/* The mark arriving.

   Six frames, near-chaos to resolved, cross-faded into one another over 1.6
   seconds. It is one tween, not five: a single eased value walks from 0 to 5 and
   each frame's opacity is read off it. That matters for two reasons. The ease
   then governs the *advance* rather than each individual hand-off, which is what
   makes the picture resolve fast and finish slowly instead of stepping through
   six evenly-spaced dissolves. And there is no moment where two adjacent frames
   are both half-transparent over the ground, which is what a naive
   fade-out-fade-in produces and which reads as a flicker on a 1-bit image.

   The frames stack, opaque over opaque. Frame one holds at full opacity for the
   whole run and every later frame arrives on top of it, so the ground never
   shows through and the card's black field is constant from the first paint to
   the last — which is also what lets the loading square hand over to it without
   a visible seam. Both are a black rectangle; only what is inside changes.

   Nothing here is allowed to half-happen. If `ready` is false the whole sequence
   is abandoned and the finished mark renders on its own. A crystallization that
   stalls in the middle is worse than one that never ran: the first reads as
   broken, the second just reads as a picture. */
export default function Crystallization({ becoming, size, ready }: Props) {
  const urls = markFrameUrls(becoming);
  const root = useRef<HTMLDivElement>(null);
  const frameEls = useRef<(HTMLImageElement | null)[]>([]);
  const run = ready && !!urls && !prefersReducedMotion();

  useEffect(() => {
    if (!run) return;
    const ctx = gsap.context(() => {
      /* One eased value, 0 -> 5, read by every frame on every tick. */
      const advance = { at: 0 };
      gsap.to(advance, {
        at: MARK_FRAMES - 1,
        duration: T.crystal.advance,
        ease: EASE.in,           // power2.out — fast, then settling
        onUpdate: () => {
          for (let j = 1; j < MARK_FRAMES; j++) {
            const el = frameEls.current[j];
            if (!el) continue;
            const o = advance.at - (j - 1);
            el.style.opacity = String(o < 0 ? 0 : o > 1 ? 1 : o);
          }
        },
      });
    }, root);
    return () => ctx.revert();
  }, [run, becoming]);

  /* The fallback, and frame six under another name. Its arrival belongs to
     whoever placed it — on the reveal that is the 400ms cross-fade. */
  if (!run || !urls) {
    return <ArchetypeMark becoming={becoming} size={size} />;
  }

  return (
    <div
      ref={root}
      aria-hidden="true"
      style={{ width: size, aspectRatio: `${MARK_ASPECT}`, flex: 'none', position: 'relative' }}
    >
      {urls.map((src, j) => (
        <img
          key={src}
          ref={(el) => { frameEls.current[j] = el; }}
          src={src}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'contain', display: 'block',
            /* Frame one is the ground and never moves off it. */
            opacity: j === 0 ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}
