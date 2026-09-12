import { useEffect, useRef } from 'react';
import { dither, makeField, punch, toImageData, type Field } from '../lib/dither';
import { ascentSample, inkAt, setHandoverPhase, DARK_AT, TOP } from '../lib/ascent';
import { prefersReducedMotion } from '../lib/motion';

interface Props {
  /** Which altitude to be at, 0..3. Changing it runs the climb. */
  altitude: number;
  /** Fires when the move has finished and another one may start. */
  onSettled?: () => void;
  /* The element the question is in. The field thins through wherever it
     actually sits, measured rather than assumed: the first version cleared a
     band at a fixed 46% of the screen, the question sits nearer a third of the
     way down, and the text landed on the weak edge of the clearing where barely
     any of it applied. The result was a page of 50% dither with black type on
     top of it. */
  clearFor?: Array<React.RefObject<HTMLElement | null>>;
  /* How far through the quiz, 0 to 1. Drawn into the field rather than laid over
     it: a hard black rule sitting on top of the grain was the one piece of the
     screen that was obviously a user interface, and it read as a bar someone had
     forgotten to style. Made of the same one-bit material, it belongs. */
  progress?: number;
  /* Drift regardless of altitude. The stars are still by design — the drift
     fades out as the climb rises — but the loading screen sits at the stars and
     needs something to bring to a stop. */
  forceDrift?: boolean;
  /* Bring the drift to a complete halt over `settleSeconds`, smoothly and
     monotonically. No acceleration, no overshoot, no shudder: the rate decays
     with zero slope at the end, so the last movement is imperceptible rather
     than a click into place. */
  settling?: boolean;
  settleSeconds?: number;
  /** Fires once, when the drift has actually reached zero. */
  onStill?: () => void;
  /* Start frozen at a given drift phase. The reveal uses this to open on exactly
     the field the loading screen stopped on. */
  initialPhase?: number;
  /* Thin the whole field out to paper over `dissolveSeconds`. The reveal runs
     this against the crystallization, so the paper arrives with the ink. */
  dissolve?: boolean;
  dissolveSeconds?: number;
  /* Where the paper starts from. The same point the ink enters at, so the two
     are one event: the ground turning to paper behind the drop as it spreads. */
  dissolveFrom?: React.RefObject<HTMLElement | null>;
}

/* Pixel scale. The buffer is the viewport divided by this, so the dither runs
   over about twenty thousand pixels rather than three hundred thousand, and the
   result is drawn back up with smoothing off — which is also where the chunky
   one-bit edge comes from. The marks were processed at scale 2; the background
   is further from the eye and can afford 4. */
const SCALE = 4;

/* Two rates, both deliberate. At rest the field only has to breathe, and five
   redraws a second is enough for a drift that takes half a minute to travel
   anywhere. During a move it has to carry a 1.2-second descent, so it goes to
   thirty — still less than half of what a per-frame animation would ask for,
   and the cost is one 4ms dither rather than a particle system. */
const REST_FPS = 5;
const MOVE_FPS = 30;

export const CLIMB_MS = 1200;

/* How long the band behind the question takes to change ends. Short enough to
   finish inside the gap where the question is faded out, long enough that the
   change is a dissolve rather than a cut. */
const POLE_S = 0.35;

/** power2.inOut, written out because this tick does not run on GSAP. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

/* The climb.
 *
 * One canvas, redrawn on a timer. Not a particle system, not a rAF loop that
 * runs at sixty and throws most of its frames away — a setTimeout tick that
 * fires five times a second while someone is reading the question and thirty
 * times a second for the 1.2 seconds they are moving between two. A rAF loop
 * would keep the compositor awake for the entire length of the quiz, which on a
 * phone is the difference between a background and a complaint.
 *
 * Everything visible is a function of one number: `a`, the altitude, running
 * 0 to 3 continuously. Moving it moves the density, the horizon and the texture
 * together, which is why the density interpolates during the move rather than
 * stepping between four presets — there are no presets, only the four points
 * the function is tuned at.
 */
export default function AscentField({
  altitude, onSettled, clearFor, progress: quizProgress = 0,
  forceDrift = false, settling = false, settleSeconds = 6, onStill,
  initialPhase, dissolve = false, dissolveSeconds = 2.2, dissolveFrom,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settled = useRef(onSettled);
  settled.current = onSettled;

  /* Everything the tick mutates lives here rather than in state: a redraw must
     not be a React render. */
  const run = useRef({
    a: altitude,
    from: altitude,
    to: altitude,
    startedAt: 0,
    moving: false,
    phase: initialPhase ?? 0,
    /* The band behind the question, eased rather than switched. See ascent.ts:
       flipping it in one frame moved a quarter of the screen's ink in that
       frame, which reads as a flash in the middle of a move that is supposed to
       be continuous. */
    pole: inkAt(altitude) > DARK_AT ? 0 : 1,
    /* Screen fractions, refreshed each draw from the element itself. */
    clearCentre: 0.42,
    clearHalf: 0.28,
    /* The hole, in screen fractions. Punched after the dither so that nothing
       at all renders over the words. */
    hole: null as null | { x0: number; y0: number; x1: number; y1: number },
  });
  const quizProgressRef = useRef(quizProgress);
  quizProgressRef.current = quizProgress;
  const still = useRef(onStill);
  still.current = onStill;
  /* 1 while drifting, 0 when stopped. Held in a ref so the deceleration is
     something the tick does rather than something React re-renders. */
  const settle = useRef({ on: false, gain: 1, at: 0, told: false, seconds: settleSeconds });
  settle.current.seconds = settleSeconds;
  const out = useRef({ on: false, at: 0, v: 0, seconds: dissolveSeconds, x: 0.5, y: 0.55, done: false });
  out.current.seconds = dissolveSeconds;

  useEffect(() => {
    const o = out.current;
    if (dissolve && !o.on) { o.on = true; o.at = performance.now(); }
    if (!dissolve && o.on) { o.on = false; o.v = 0; }
  }, [dissolve]);

  useEffect(() => {
    const st = settle.current;
    if (settling && !st.on) { st.on = true; st.at = performance.now(); st.told = false; }
    if (!settling && st.on) { st.on = false; st.gain = 1; st.told = false; }
  }, [settling]);

  /* Start a move whenever the target changes. The tick reads this; it does not
     restart the timer, so a target that changes mid-move simply re-aims. */
  useEffect(() => {
    const r = run.current;
    const target = Math.max(0, Math.min(TOP, altitude));
    if (target === r.to) return;
    r.from = r.a;
    r.to = target;
    r.startedAt = performance.now();
    r.moving = true;
  }, [altitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    let field: Field | null = null;
    let image: ImageData | null = null;
    let timer = 0;
    let stopped = false;
    let last = performance.now();

    const size = () => {
      const w = Math.max(1, Math.ceil(window.innerWidth / SCALE));
      const h = Math.max(1, Math.ceil(window.innerHeight / SCALE));
      if (field && field.w === w && field.h === h) return;
      field = makeField(w, h);
      image = ctx.createImageData(w, h);
      canvas.width = w;
      canvas.height = h;
      /* The canvas is a small buffer stretched by CSS, so the browser does the
         scaling on the GPU and the only thing JavaScript touches is the buffer. */
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };

    const draw = (now: number) => {
      if (!field || !image) return;
      const r = run.current;
      const dt = Math.min(250, now - last) / 1000;
      last = now;

      let progress = 1;
      /* The hole is there to keep the field off the words. While the question is
         faded out there are no words, so there is no hole — otherwise a solid
         rectangle sits in the middle of the move with nothing in it, which reads
         as a panel rather than as a clearing. It closes with the text at 200ms
         and opens again with it at 900ms, on the same linear clock the text
         uses rather than the eased one the field does. */
      let holeStrength = 1;
      if (r.moving) {
        const t = Math.min(1, (now - r.startedAt) / CLIMB_MS);
        const OUT_FROM = 200 / CLIMB_MS, OUT_TO = 500 / CLIMB_MS;
        const IN_FROM = 900 / CLIMB_MS, IN_TO = 1200 / CLIMB_MS;
        holeStrength = t < OUT_FROM ? 1
          : t < OUT_TO ? 1 - (t - OUT_FROM) / (OUT_TO - OUT_FROM)
          : t < IN_FROM ? 0
          : Math.min(1, (t - IN_FROM) / (IN_TO - IN_FROM));
        progress = easeInOut(t);
        r.a = r.from + (r.to - r.from) * progress;
        if (t >= 1) {
          r.a = r.to;
          r.moving = false;
          settled.current?.();
        }
      }

      /* Follow the question. Reading a rect per draw is five reads a second at
         rest, which is nothing, and it means the clearing tracks a growing
         textarea and a rotated phone without being told about either. */
      /* The union of everything that has to stay readable. The question number
         is positioned outside the column it belongs to, so it was the one piece
         of type the hole did not cover and it disappeared into the grain. */
      const rects = (clearFor ?? [])
        .map((ref) => ref.current?.getBoundingClientRect())
        .filter((b): b is DOMRect => !!b && b.width > 0 && b.height > 0);
      if (rects.length) {
        const vh = window.innerHeight || 1;
        const vw = window.innerWidth || 1;
        const left = Math.min(...rects.map((b) => b.left));
        const right = Math.max(...rects.map((b) => b.right));
        const topPx = Math.min(...rects.map((b) => b.top));
        const bottomPx = Math.max(...rects.map((b) => b.bottom));
        const pad = 28;                       // a little air above and below the words
        const top = (topPx - pad) / vh;
        const bottom = (bottomPx + pad) / vh;
        r.clearCentre = (top + bottom) / 2;
        /* A floor, so a one-line question still gets a band worth reading on. */
        r.clearHalf = Math.max(0.18, (bottom - top) / 2);
        /* The hole itself sits just inside the cleared band, so the thinning
           around it hides the edge. */
        r.hole = {
          x0: (left - 18) / vw,
          y0: (topPx - 18) / vh,
          x1: (right + 18) / vw,
          y1: (bottomPx + 14) / vh,
        };
      } else {
        r.hole = null;
      }

      const wantPole = inkAt(r.a) > DARK_AT ? 0 : 1;
      const step = dt / POLE_S;
      r.pole += Math.max(-step, Math.min(step, wantPole - r.pole));

      /* The drift belongs to the depths. It fades out as the climb rises, which
         is why the stars are still. Frozen entirely under reduced motion. */
      const st = settle.current;
      if (st.on) {
        const k = Math.min(1, (now - st.at) / (st.seconds * 1000));
        /* (1-k)^2: the rate falls away and arrives at exactly zero with zero
           slope, so it stops rather than halting. */
        st.gain = (1 - k) * (1 - k);
        if (k >= 1 && !st.told) {
          st.told = true;
          st.gain = 0;
          /* Write down where the drift stopped, so whatever mounts next can open
             on this exact frame rather than on something that merely resembles
             it. */
          setHandoverPhase(r.phase);
          still.current?.();
        }
      }
      const driftBase = forceDrift ? 0.42 : 0.55 * Math.max(0, 1 - r.a / TOP);
      if (!reduced) r.phase += dt * driftBase * st.gain;

      const o = out.current;
      if (o.on) {
        const k = Math.min(1, (now - o.at) / (o.seconds * 1000));
        /* The same curve the ink spreads on, so the two are locked together and
           the paper is always a little ahead of the drop — arriving underneath
           it rather than chasing it. */
        const P = 1.7, c = Math.pow(2, P - 1);
        o.v = k < 0.5 ? c * Math.pow(k, P) : 1 - c * Math.pow(1 - k, P);
        /* Once the paper has arrived the field has no further job, and leaving
           it drawing is not free: the front is computed against the viewport's
           proportions, so a rotation or a resize afterwards re-runs it against a
           different shape and can bring the dark back on a page that finished
           the sequence a minute ago. It also stops the tick for good. */
        if (k >= 1) { o.done = true; canvas.style.display = 'none'; stopped = true; }
        const src = dissolveFrom?.current;
        if (src) {
          const b = src.getBoundingClientRect();
          /* The ink's own seed: halfway across the card, three fifths down it. */
          o.x = (b.left + b.width * 0.5) / (window.innerWidth || 1);
          o.y = (b.top + b.height * 0.6) / (window.innerHeight || 1);
        }
      }

      dither(field, ascentSample({
        w: field.w, h: field.h, phase: r.phase, still: reduced, pole: r.pole,
        clearCentre: r.clearCentre, clearHalf: r.clearHalf,
        dissolveAt: out.current.on ? { x: out.current.x, y: out.current.y } : undefined,
        dissolveProgress: out.current.on ? out.current.v : undefined,
        /* During a move the arriving altitude is the target, and the boundary
           between it and the one being left sweeps down the screen. */
        a: r.moving ? r.to : r.a,
        from: r.moving ? r.from : undefined,
        progress: r.moving ? progress : undefined,
      }));
      /* Nothing renders over the words. The clearing thins the field around
         them; this removes it entirely from the block itself. */
      if (r.hole && holeStrength > 0.001) {
        punch(field, {
          x0: r.hole.x0 * field.w, y0: r.hole.y0 * field.h,
          x1: r.hole.x1 * field.w, y1: r.hole.y1 * field.h,
        }, r.pole > 0.5 ? 255 : 0, 3, holeStrength);
      }

      /* The progress rule, in the field's own material: one buffer row, set to
         whichever end of the scale the surrounding field is not. */
      const prog = Math.max(0, Math.min(1, quizProgressRef.current));
      if (prog > 0) {
        const inset = Math.round(field.w * 0.045);
        const width = Math.round((field.w - inset * 2) * prog);
        if (width > 0) {
          punch(field, { x0: inset, y0: 1, x1: inset + width, y1: 2 },
            r.pole > 0.5 ? 0 : 255, 0);
        }
      }

      toImageData(field, image, [0xFB, 0xFA, 0xF7]);
      ctx.putImageData(image, 0, 0);
    };

    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      /* Hidden tabs get nothing. setTimeout is already throttled there, but not
         drawing at all is the difference between throttled and free. */
      if (!document.hidden) draw(now);
      const fps = run.current.moving ? MOVE_FPS : REST_FPS;
      timer = window.setTimeout(tick, 1000 / fps);
    };

    const onResize = () => { size(); draw(performance.now()); };

    size();
    draw(performance.now());
    tick();
    window.addEventListener('resize', onResize);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-ascent-field=""
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        display: 'block', zIndex: 0, pointerEvents: 'none',
        /* The buffer is a quarter scale in each axis; this is what makes it read
           as a one-bit field rather than a blurred photograph of one. */
        imageRendering: 'pixelated',
      }}
    />
  );
}
