import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SquareReveal from '../components/SquareReveal';

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

/* Roughly how long a generation takes. The fill is a duration, not a progress
   bar — it makes no claim about how far along the model is, it gives the pause a
   length. Past twenty seconds it simply holds full rather than resetting,
   because the wait is genuinely open-ended. */
const FILL_MS = 20000;

/* Reduced motion gets one frozen frame of the same object rather than a
   different object. Half full reads as "in progress" without moving. */
const STATIC_FILL = 0.5;

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
  const reduceMotion = useReducedMotion();
  const [fill, setFill] = useState(0);
  const done = Boolean(archetype);

  /* Elapsed time since this screen appeared, which is the moment generation
     started. Driving the fill off a clock rather than off a fixed animation
     means it stays honest across a re-render, and stops the moment the reading
     lands instead of continuing to imply work that is already finished. */
  useEffect(() => {
    if (reduceMotion || done) return;
    const started = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const elapsed = performance.now() - started;
      setFill(Math.min(1, elapsed / FILL_MS));
      if (elapsed < FILL_MS) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, done]);

  /* Hold on the name before handing over to the reading. */
  useEffect(() => {
    if (!done || !onRevealed) return;
    const t = setTimeout(onRevealed, reduceMotion ? 400 : 1500);
    return () => clearTimeout(t);
  }, [done, onRevealed, reduceMotion]);

  /* Derived at render, not seeded into state: useReducedMotion can resolve after
     the first paint, and a state initializer only runs once — which would leave
     a reduced-motion viewer looking at a permanently empty square. */
  const level = done ? 1 : reduceMotion ? STATIC_FILL : fill;

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
          <SquareReveal name={archetype} fill={level} breathe size={SIZE} />

          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: done ? 0 : 1 }}
            transition={{ duration: reduceMotion ? 0 : done ? 0.4 : 1.2, ease: 'easeOut' }}
            style={{
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
          </motion.p>
        </>
      )}
    </div>
  );
}
