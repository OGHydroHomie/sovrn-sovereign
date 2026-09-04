import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  /** Set to run the dissolve. Until then the square holds. */
  name: string | null;
  /** 0 to 1. How much of the square is inked. 1 is solid. */
  fill?: number;
  breathe?: boolean;
  size?: string;
  /** How long the square takes to open and go. Day 7 is deliberately slower. */
  dissolveMs?: number;
  nameDelayMs?: number;
  nameFadeMs?: number;
  /** Name type. Matches the reveal's heading by default. */
  nameSize?: string;
}

/* The mark, and the one motion the product owns.

   The square opens and the name arrives where it was. It happens twice: at the
   end of a generation, and on day 7 when the becoming stops reading "in
   progress". Both are the same movement on purpose — the second one is supposed
   to rhyme with the first — so it lives in one component rather than being
   written out twice and drifting apart.

   DESIGN_FROZEN.md: cream ground, black, Geist Sans, no cosmic imagery.
   prefers-reduced-motion drops the breathing and the scaling and leaves a
   cross-fade, which is the same event without the movement. */
export default function SquareReveal({
  name,
  fill = 1,
  breathe = false,
  size = 'clamp(132px, 42vw, 180px)',
  dissolveMs = 900,
  nameDelayMs = 450,
  nameFadeMs = 700,
  nameSize = 'clamp(38px, 11.5vw, 60px)',
}: Props) {
  const reduceMotion = useReducedMotion();
  const done = Boolean(name);
  const s = (ms: number) => ms / 1000;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Breathing sits on its own wrapper so it cannot fight the dissolve for
          control of the same transform. */}
      <motion.div
        animate={!breathe || reduceMotion || done ? { scale: 1 } : { scale: [1, 1.03, 1] }}
        transition={
          !breathe || reduceMotion || done
            ? { duration: 0.2 }
            : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{ width: '100%', height: '100%' }}
      >
        <motion.div
          aria-hidden="true"
          animate={done ? { scale: reduceMotion ? 1 : 1.5, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={done ? { duration: reduceMotion ? s(nameFadeMs) : s(dissolveMs), ease: 'easeIn' } : { duration: 0 }}
          style={{
            width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
            border: '2px solid #000000', background: '#FBFAF7', boxSizing: 'border-box',
          }}
        >
          <motion.div
            animate={{ height: `${Math.max(0, Math.min(1, fill)) * 100}%` }}
            transition={{ duration: 0 }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#000000' }}
          />
        </motion.div>
      </motion.div>

      {done && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reduceMotion ? s(nameFadeMs) : s(nameFadeMs),
            delay: reduceMotion ? 0 : s(nameDelayMs),
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw', maxWidth: 560,
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: nameSize, lineHeight: 1.04,
            letterSpacing: '0.01em', color: '#000000', textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {name}
        </motion.div>
      )}
    </div>
  );
}
