import { useEffect } from 'react';
import { useRef } from 'react';
import { useFadeTo } from '../components/Fade';
import SquareReveal from '../components/SquareReveal';
import { T, prefersReducedMotion } from '../lib/motion';

interface Props {
  /* Set when generation failed. The person stays here rather than being sent
     back through the quiz — their eight answers are still in state and in
     localStorage, and retry reuses them. */
  error?: string | null;
  onRetry?: () => void;
  /** Set the moment the reading arrives. Runs the square's dissolve into the name. */
  archetype?: string | null;
  /** Called once the name has landed and the reading is allowed to open. */
  onRevealed?: () => void;
}



/* The mark. Large enough to be the only thing on the page. */
const SIZE = 'clamp(132px, 42vw, 180px)';

/* The anticipation beat. Paper ground, one object, one line beneath it.

   The square is the logo, and it does three things: it breathes, it fills over
   the length of a generation, and when the reading arrives it opens up and
   dissolves into the name. The name is set in exactly the type the reveal uses,
   in the same colour, so the handoff to the reading is one continuous movement
   rather than two separate ones.

   DESIGN_FROZEN.md: cream ground, black, Geist Sans, no cosmic imagery. No
   spinner — a spinner says "the machine is busy," and this moment is supposed to
   say "something is about to be said about you." */
export default function LoadingPage({ error = null, onRetry, archetype = null, onRevealed }: Props) {
  const captionRef = useRef<HTMLParagraphElement>(null);
  const reduceMotion = prefersReducedMotion();
  const done = Boolean(archetype);

  /* Hold on the name before handing over to the reading. */
  useEffect(() => {
    if (!done || !onRevealed) return;
    const t = setTimeout(onRevealed, (reduceMotion ? 0.4 : T.square.hold) * 1000);
    return () => clearTimeout(t);
  }, [done, onRevealed, reduceMotion]);

  /* The caption fades up while the square fills, and out again the moment the
     name takes its place. */
  useFadeTo(captionRef, !done, done ? 0.4 : 1.2);

  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#FBFAF7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {error ? (
        <>
          <p
            style={{
              fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 'clamp(19px, 5.2vw, 23px)', lineHeight: 1.45,
              letterSpacing: '-0.01em', color: '#1A1A1A', maxWidth: 320,
            }}
          >
            That didn&rsquo;t come through.
          </p>
          <p
            style={{
              marginTop: 14, fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 15, lineHeight: 1.6, color: '#6E6A66', maxWidth: 320,
            }}
          >
            Your eight answers are still here. Nothing you typed was lost.
          </p>

          <button
            onClick={onRetry}
            style={{
              marginTop: 32, minHeight: 48, minWidth: 200,
              background: '#000000', color: '#FBFAF7', border: 'none', borderRadius: 2,
              fontFamily: 'var(--sv-font)', fontWeight: 700, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              padding: '16px 28px', cursor: 'pointer',
            }}
          >
            Try again
          </button>

          <p
            style={{
              marginTop: 20, fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 12, lineHeight: 1.6, color: '#9A9A9A', maxWidth: 320,
            }}
          >
            {error}
          </p>
        </>
      ) : (
        <>
          {/* The same mark, and the same motion, the becoming resolves with on
              day 7. One component so the two cannot drift apart. */}
          <SquareReveal name={archetype} fillDuration={T.square.fill} breathe size={SIZE} />

          <p
            ref={captionRef}
            style={{
              opacity: 0,
              marginTop: 34,
              fontFamily: 'var(--sv-font)',
              fontWeight: 300,
              fontSize: 14,
              lineHeight: 1.5,
              letterSpacing: '0.01em',
              color: '#6E6A66',
              maxWidth: 320,
            }}
          >
            This takes about twenty seconds.
          </p>
        </>
      )}
    </div>
  );
}
