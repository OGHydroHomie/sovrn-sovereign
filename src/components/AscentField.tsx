import { useEffect, useRef } from 'react';
import { dither, makeField, punch, toImageData, type Field } from '../lib/dither';
import { ascentSample, inkAt, DARK_AT, TOP } from '../lib/ascent';
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
  clearFor?: React.RefObject<HTMLElement | null>;
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
export default function AscentField({ altitude, onSettled, clearFor }: Props) {
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
    phase: 0,
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
      const el = clearFor?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const vw = window.innerWidth || 1;
        const pad = 28;                       // a little air above and below the words
        const top = (rect.top - pad) / vh;
        const bottom = (rect.bottom + pad) / vh;
        r.clearCentre = (top + bottom) / 2;
        /* A floor, so a one-line question still gets a band worth reading on. */
        r.clearHalf = Math.max(0.18, (bottom - top) / 2);
        /* The hole itself sits just inside the cleared band, so the thinning
           around it hides the edge. */
        r.hole = {
          x0: (rect.left - 18) / vw,
          y0: (rect.top - 18) / vh,
          x1: (rect.right + 18) / vw,
          y1: (rect.bottom + 14) / vh,
        };
      } else {
        r.hole = null;
      }

      const wantPole = inkAt(r.a) > DARK_AT ? 0 : 1;
      const step = dt / POLE_S;
      r.pole += Math.max(-step, Math.min(step, wantPole - r.pole));

      /* The drift belongs to the depths. It fades out as the climb rises, which
         is why the stars are still. Frozen entirely under reduced motion. */
      if (!reduced) r.phase += dt * 0.55 * Math.max(0, 1 - r.a / TOP);

      dither(field, ascentSample({
        w: field.w, h: field.h, phase: r.phase, still: reduced, pole: r.pole,
        clearCentre: r.clearCentre, clearHalf: r.clearHalf,
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
