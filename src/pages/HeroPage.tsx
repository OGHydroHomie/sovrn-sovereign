import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { trackEvent, getBlueprint } from '../utils/storage';
import AscentField from '../components/AscentField';
import { HERO_STARS, TOP } from '../lib/ascent';
import { prefersReducedMotion } from '../lib/motion';

interface Props {
  onStart: () => void;
}

/* The door.
 *
 * SOVRN above it, one word below it, a hairline, and the picture. No sentence:
 * the line that used to sit here was the threshold's heading word for word, and
 * a caption under this artwork is a hedge. The image is the argument.
 *
 * Going through is a push *into* the doorway rather than the page sliding away.
 * The artwork already contains a starfield above the figure's head — light from
 * beyond the door — so the destination was always in the picture. The field that
 * arrives is the one the quiz climbs to, at the density of the painted stars, so
 * the handover is the same system rather than two things matched by eye.
 */

const PAPER = '#FBFAF7';
const SRC = '/hero-host.jpg';
const SRC_SMALL = '/hero-host-720.jpg';

/* Measured off the artwork, in its own coordinates.
 *
 *   the doorway light   v 0.08 .. 0.24, x 0.32 .. 0.83
 *   the figure's head   v 0.245
 *   the torso's base    v 0.62
 *   the feet            v 0.82
 *
 * The origin sits in the light above the head, so everything below it travels
 * downward as the scale runs and the figure leaves through the bottom.
 */
const ORIGIN = '52% 18%';

/* 1.8, not the 3.2 that would put the doorway across the whole viewport.
 *
 * Scaling about (0.52, 0.18), the bottom edge of the frame sits at artwork
 * v = 0.18 + 0.82/S. At 3.2 that is v 0.44 — a cut through the middle of the
 * torso. The torso ends at 0.62, so S must stay under 1.86 for the figure to
 * leave intact, and the cut at 1.8 falls at v 0.636, in the legs. Losing travel
 * is the cheaper loss. */
const SCALE = 1.8;

export default function HeroPage({ onStart }: Props) {
  const art = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    trackEvent('pageView', 'hero');
    setReturning(Boolean(getBlueprint()));
  }, []);

  const enter = () => {
    if (leaving.current) return;
    leaving.current = true;
    trackEvent('quizStart');

    if (prefersReducedMotion()) {
      /* No scale, no build. The field is already there; the artwork leaves. */
      gsap.set(sky.current, { opacity: 1 });
      gsap.to(art.current, { opacity: 0, duration: 0.4, ease: 'power1.inOut' });
      gsap.to([mark.current, word.current, rule.current], {
        opacity: 0, duration: 0.4, ease: 'power1.inOut', onComplete: onStart,
      });
      return;
    }

    const tl = gsap.timeline({ onComplete: onStart });
    /* The hairline goes first — it is the only thing that was moving. */
    tl.to(rule.current, { opacity: 0, duration: 0.16, ease: 'power1.in' }, 0);
    tl.to(mark.current, { opacity: 0, y: -70, duration: 0.4, ease: 'power1.in' }, 0);
    tl.to(word.current, { opacity: 0, y: 70, duration: 0.4, ease: 'power1.in' }, 0);
    /* Into the doorway. Accelerating, because a door you are walking through
       does not slow down as it arrives. */
    tl.to(art.current, {
      scale: SCALE, duration: 1.2, ease: 'power2.in', transformOrigin: ORIGIN,
    }, 0.2);
    /* The sky comes up under the artwork while the artwork is still there, so
       the painted stars and the generated ones overlap before either is alone. */
    tl.to(sky.current, { opacity: 1, duration: 1.0, ease: 'power1.inOut' }, 0.6);
    tl.to(art.current, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 1.2);
  };

  useEffect(() => {
    let startY: number | null = null;
    let startAt = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; startAt = Date.now(); };
    const onTouchEnd = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.changedTouches[0].clientY - startY;
      const quick = Date.now() - startAt < 900;
      startY = null;
      if (quick && dy < -48) enter();
    };
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 12) enter(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'PageUp') {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The only thing moving on the page. */
  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set(rule.current, { scaleY: 1, opacity: 0.5 });
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
      tl.fromTo(rule.current, { scaleY: 0, opacity: 0.75 }, { scaleY: 1, duration: 1.5, ease: 'none' });
      tl.to(rule.current, { opacity: 0, duration: 0.45, ease: 'power1.in' }, '-=0.45');
    }, rule);
    return () => ctx.revert();
  }, []);

  return (
    <div
      onClick={enter}
      style={{
        position: 'relative', height: '100svh', width: '100%',
        overflow: 'hidden', background: '#000000',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      {/* Behind everything, and dark until the door opens. */}
      <div ref={sky} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
        <AscentField altitude={TOP} {...HERO_STARS} />
      </div>

      {/* The artwork, in a box of its own proportions. Everything that sits on
          the picture is positioned against this rather than against the screen,
          so the word never drifts onto the figure when the viewport changes
          shape. */}
      <div
        ref={art}
        style={{
          position: 'absolute', inset: 0, margin: 'auto',
          aspectRatio: '1080 / 1920', maxWidth: '100%', maxHeight: '100%',
          height: '100%', willChange: 'transform',
        }}
      >
        <img
          src={SRC}
          srcSet={`${SRC_SMALL} 720w, ${SRC} 1080w`}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ fetchpriority: 'high' } as any)}
          decoding="async"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* SOVRN, above the door. The first word anyone reads. Display size and
            wide tracking; the same typeface as everything else. It does not
            breathe here — the hairline is the only motion on this screen. */}
        {/* The page's heading, and the only one it has. It is a brand mark set
            large rather than a sentence, but it is still the thing this page is
            called — and a landing page with no heading at all is a page a screen
            reader cannot announce. */}
        <h1
          ref={mark}
          style={{
            margin: 0,
            position: 'absolute', left: 0, right: 0, top: '10.5%',
            textAlign: 'center', color: PAPER,
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: 'clamp(30px, 9.4vw, 54px)',
            letterSpacing: '0.42em',
            /* Tracking pushes the last letter right; this recentres the word. */
            textIndent: '0.42em',
            lineHeight: 1,
          }}
        >
          SOVRN
        </h1>

        {/* One word, in the clean dark below the figure's feet at v 0.82. */}
        <div
          ref={word}
          style={{
            position: 'absolute', left: 0, right: 0, top: '87%',
            textAlign: 'center',
            fontFamily: 'var(--sv-font)', fontWeight: 300,
            fontSize: 'clamp(13px, 3.5vw, 15px)',
            letterSpacing: '0.16em',
            color: 'rgba(251,250,247,0.72)',
          }}
        >
          ascend
        </div>

        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: 0, right: 0, top: '91.5%',
            display: 'flex', justifyContent: 'center',
          }}
        >
          <div
            ref={rule}
            style={{ width: 1, height: 40, background: PAPER, transformOrigin: '50% 100%', opacity: 0 }}
          />
        </div>
      </div>

      <button
        onClick={enter}
        style={{
          position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
          overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
        }}
      >
        Enter
      </button>

      {returning && (
        <a
          href="/ledger"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', right: 20, bottom: 18, zIndex: 2,
            fontFamily: 'var(--sv-font)', fontSize: 12, fontWeight: 400,
            letterSpacing: '0.02em', color: 'rgba(251,250,247,0.55)',
            textDecoration: 'none', borderBottom: '1px solid rgba(251,250,247,0.26)',
            paddingBottom: 1,
          }}
        >
          Your Ledger
        </a>
      )}
    </div>
  );
}
