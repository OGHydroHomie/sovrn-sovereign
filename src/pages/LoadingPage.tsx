import { useEffect } from 'react';
import { useRef } from 'react';
import SquareReveal from '../components/SquareReveal';
import AscentField from '../components/AscentField';
import { TOP } from '../lib/ascent';
import { T, prefersReducedMotion } from '../lib/motion';
import { markFrameUrls, preloadFrames } from '../lib/marks';

interface Props {
  /* Set when generation failed. The person stays here rather than being sent
     back through the quiz — their eight answers are still in state and in
     localStorage, and retry reuses them. */
  error?: string | null;
  onRetry?: () => void;
  /* Set the moment the reading arrives. The square completes its fill and the
     page turns; the name itself now belongs to the reveal, which stamps it in
     after the mark has crystallized. */
  archetype?: string | null;
  /* Called when the reveal may open. The flag says whether all six
     crystallization frames decoded in time — false means the reveal shows the
     finished mark instead, and never a half-run sequence. */
  onRevealed?: (framesReady: boolean) => void;
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
  const squareRef = useRef<HTMLDivElement>(null);
  const reduceMotion = prefersReducedMotion();
  const done = Boolean(archetype);

  /* The hand-over.

     Two things have to finish before the page turns: the square has to close out
     its fill, so the reveal opens on the same solid black it left on, and all
     six crystallization frames have to be decoded, so frame one paints on the
     reveal's first frame rather than a beat later. Both run at once and the
     slower one decides — but the frames are never allowed to be the reason
     someone waits, so preloadFrames gives up on its own and reports false.

     Under reduced motion there is nothing to preload: the reveal cross-fades
     the finished mark in and the five earlier frames are never fetched. */
  useEffect(() => {
    if (!done || !onRevealed) return;
    let live = true;

    /* The settle, then the beat. Six seconds of everything slowing to a stop,
       then a full second of a finished square on a frozen field with nothing
       happening at all. The stillness is the charge — the crystallization lands
       on a screen where nothing has moved for a second, which is why it reads as
       an arrival rather than as the next thing in a queue. */
    const settled = new Promise<void>((resolve) => {
      setTimeout(resolve, (reduceMotion ? 0 : T.square.settle + T.square.settleHold) * 1000);
    });
    const urls = markFrameUrls(archetype);
    const frames = reduceMotion || !urls
      ? Promise.resolve(false)
      : preloadFrames(urls);

    void Promise.all([settled, frames]).then(([, framesReady]) => {
      if (live) onRevealed(framesReady);
    });

    return () => { live = false; };
  }, [done, onRevealed, reduceMotion, archetype]);

  /* The caption is gone. "This takes about twenty seconds" was the square's own
     job written out in words: the square fills over exactly that, and a sentence
     restating it made the wait feel supervised. */

  return (
    <div
      /* The field here is the stars: 96% ink. The square and anything else on
         this screen have to be set in paper, the same way the last question was.
         The error state keeps the plain ground — a failure is not a view. */
      data-tone={!error ? 'paper' : undefined}
      style={{
        minHeight: '100svh',
        background: '#FBFAF7',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {/* The field the quiz ended on, carried through. Question eight is the
          stars, and dropping to bare paper for the wait threw away the one
          moment the climb had been building toward. It drifts here — the stars
          are still on the climb itself — and then it stops. */}
      {!error && <AscentField altitude={TOP} clearFor={[squareRef]} forceDrift settling={done} settleSeconds={T.square.settle} />}

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
              fontSize: 12, lineHeight: 1.6, color: '#6E6A66', maxWidth: 320,
            }}
          >
            {error}
          </p>
        </>
      ) : (
        <>
          {/* The same mark, and the same motion, the becoming resolves with on
              day 7. One component so the two cannot drift apart. */}
          {/* The square no longer dissolves into the name — it completes, and
              the reveal picks the same rectangle up as the first frame of the
              crystallization. `name` is left unset on purpose. */}
          <div ref={squareRef} style={{ position: 'relative', zIndex: 1 }}>
            <SquareReveal
              name={null}
              settle={done}
              settleSeconds={T.square.settle}
              fillDuration={T.square.fill}
              breathe
              size={SIZE}
            />
          </div>

        </>
      )}
    </div>
  );
}
