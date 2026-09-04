import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  /* Set when generation failed. The person stays here rather than being sent
     back through the quiz — their eight answers are still in state and in
     localStorage, and retry reuses them. */
  error?: string | null;
  onRetry?: () => void;
}

/* The anticipation beat. Paper ground, one line, one line of movement.

   The copy states the wait rather than narrating what the machine is doing.
   Placeholder until the logo animation lands.

   DESIGN_FROZEN.md: cream ground, black, Geist Sans, no cosmic imagery — so the
   constellation, the star field, and the rotating oracle copy are gone. No
   spinner either: a spinner says "the machine is busy," and this moment is
   supposed to say "something is about to be said about you."

   The single motion is a hairline drawing itself across the page over roughly
   the length of a generation. It is deliberately not a progress bar — it makes
   no claim about how far along anything is, it just gives the pause a length. */
export default function LoadingPage({ error = null, onRetry }: Props) {
  const reduceMotion = useReducedMotion();

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
            Your answers are safe. Nothing was lost.
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
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              fontFamily: 'var(--sv-font)',
              fontWeight: 300,
              fontSize: 'clamp(19px, 5.2vw, 23px)',
              lineHeight: 1.45,
              letterSpacing: '-0.01em',
              color: '#1A1A1A',
              maxWidth: 320,
            }}
          >
            This takes about twenty seconds.
          </motion.p>

          {/* The one motion. Draws to full over ~22s, then holds. */}
          <div
            aria-hidden="true"
            style={{ marginTop: 40, width: 'min(240px, 62vw)', height: 1, background: '#E4E0D6' }}
          >
            <motion.div
              initial={{ width: reduceMotion ? '38%' : '0%' }}
              animate={{ width: reduceMotion ? '38%' : '100%' }}
              transition={reduceMotion ? { duration: 0 } : { duration: 22, ease: 'easeOut' }}
              style={{ height: 1, background: '#1A1A1A' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
