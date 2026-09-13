import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import AscentField from './AscentField';
import Unbinding from './Unbinding';
import { TOP } from '../lib/ascent';
import { T, EASE, prefersReducedMotion } from '../lib/motion';
import type { Trial } from './TrialCard';

export interface Unbound {
  figure: Trial['figure'];
  /** Their day, worked out on the server in their own timezone. */
  date: string;
  /** What they wrote when they filed it. Null for a day crossed without a line. */
  act: string | null;
  dayNumber: number | null;
}

interface Props {
  unbound: Unbound;
  onDone: () => void;
}

const NAME: Record<Trial['figure'], string> = {
  devil: 'The Devil',
  hermit: 'The Hermit',
  sun: 'The Sun',
};

/* The unbinding.
 *
 * The one moment in this product that is purely a reward, and it happens once
 * per figure ever. Everything about the staging is restraint: the card is still
 * for the first six hundred milliseconds, the binding falls, the figure settles
 * with a single pulse, and then nothing happens at all for eight hundred
 * milliseconds before a single line appears. Nothing bounces, nothing
 * celebrates, nothing is congratulated.
 *
 * The line is a record rather than a citation — a name, a word, and the date it
 * happened — and the act underneath it is in their own words, because what they
 * wrote when they filed the day is the only evidence here that is theirs.
 */
export default function TrialUnbinding({ unbound, onDone }: Props) {
  const root = useRef<HTMLDivElement | null>(null);
  const columnRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLParagraphElement | null>(null);
  const actRef = useRef<HTMLDivElement | null>(null);
  const reduced = prefersReducedMotion();
  const HIDDEN = { opacity: 0 } as const;

  /* The paper goes out first, exactly as the arrival does. */
  useLayoutEffect(() => {
    if (!root.current) return;
    if (reduced) { gsap.set(root.current, { opacity: 1 }); return; }
    const ctx = gsap.context(() => {
      gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: T.trial.cover, ease: EASE.panel });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  useLayoutEffect(() => {
    const t = T.unbind;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: onDone });

      if (reduced) {
        tl.to([lineRef.current, actRef.current], { opacity: 1, duration: t.reducedFade, ease: EASE.in })
          .to({}, { duration: 1.2 })
          .to(root.current, { opacity: 0, duration: t.reducedFade, ease: EASE.panel });
        return;
      }

      /* The card is on its own clock — it has to be, because the fall and the
         pulse are pixel work on a rAF rather than tweened properties. These
         beats are written against the same zero, and the hold between the pulse
         ending and the line arriving is deliberately the longest gap in the
         sequence. */
      tl.to(lineRef.current, { opacity: 1, duration: t.line, ease: EASE.in }, t.lineAt)
        .fromTo(actRef.current,
          { opacity: 0, y: t.actRiseFrom },
          { opacity: 1, y: 0, duration: t.act, ease: EASE.in }, t.actAt)
        .to(root.current, { opacity: 0, duration: t.handover, ease: EASE.panel }, t.handoverAt);
    }, root);
    return () => ctx.revert();
  }, [reduced, onDone]);

  return (
    <div
      ref={root}
      data-unbinding-screen={unbound.figure}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#000000', color: '#FBFAF7', opacity: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 26px', overflow: 'hidden',
      }}
    >
      {/* Already still. The arrival stops the field because something is about
          to appear out of it; here the figure is already on screen and has been
          for days, so there is nothing to bring to a halt. */}
      {!reduced && <AscentField altitude={TOP} clearFor={[columnRef]} />}

      <div
        ref={columnRef}
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        <Unbinding becoming={NAME[unbound.figure]} size="min(52vw, 208px)" />

        {/* A record, not a citation. Name, state, date — and the date is theirs. */}
        <p
          ref={lineRef}
          data-unbound="line"
          className="sv-label"
          style={{
            margin: '30px 0 0', fontSize: 12, fontWeight: 700, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#FBFAF7', textAlign: 'center', ...HIDDEN,
          }}
        >
          {NAME[unbound.figure]} <span style={{ opacity: 0.62 }}>· freed ·</span> {unbound.date}
        </p>

        {/* Their words. Nothing here is generated: this is the line they wrote
            when they filed the day, and it is the only evidence on screen that
            belongs to them rather than to the product. */}
        {unbound.act && (
          <div ref={actRef} data-unbound="act" style={{ marginTop: 26, maxWidth: 360, ...HIDDEN }}>
            <p
              style={{
                margin: 0, textAlign: 'center',
                fontFamily: 'var(--sv-font)', fontWeight: 300,
                fontSize: 'clamp(17px, 4.6vw, 20px)', lineHeight: 1.45,
                letterSpacing: '-0.005em', color: '#FBFAF7',
              }}
            >
              &ldquo;{unbound.act}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
