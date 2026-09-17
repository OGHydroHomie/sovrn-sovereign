import { useEffect, useRef, useState } from 'react';
import { T, prefersReducedMotion } from '../lib/motion';
import { MARK_ASPECT, MARK_FRAMES, markFrameUrls, markSlug } from '../lib/marks';
import ArchetypeMark from './ArchetypeMark';

interface Props {
  becoming: string | null | undefined;
  /** Width of the card. Height follows the art's own 2:3. */
  size: number | string;
  /* True only when all six frames are already decoded and the sequence is
     wanted. The preload happens on the loading screen, before this ever mounts:
     the first paint of the reveal has to have ink already on it, and a component
     that starts fetching when it mounts cannot do that. False here means the
     finished mark, which is the fallback for every reason at once — a missing
     file, a slow network, reduced motion, a return visit. */
  ready: boolean;
  /* Fired on the first frame of the spread — not on mount.
     The gap between the two is the images being decoded into this canvas, and
     it is real: a caller that started its own sequence when it mounted this
     component was running four hundred milliseconds ahead of the ink, which ate
     most of the hold the sequence is built around. Anything timed against the
     card should be timed against this. */
  onBegin?: () => void;
  /* Loop mode, for the front door.
   *
   * The reveal shows one card once and stops — that is a thing arriving, and it
   * arrives exactly as many times as it happens. The marketing hero shows the
   * same mechanic as an idle: in, hold, dissolve, and tell the caller to hand
   * over the next figure. The drawing is identical; only what happens to `t`
   * differs, which is why this is a mode here rather than a second component
   * carrying its own copy of the ink maths.
   *
   * Off by default. The reveal never sets it and its path is unchanged. */
  loop?: boolean;
  /** Fired when a loop's dissolve has finished and the next card may take over. */
  onCycle?: () => void;
  /* How long the spread takes. Defaults to the reveal's 2.2s, which is tuned
     for one card arriving with the screen to itself. Thirteen of them resolving
     in a grid is a different event — at 2.2s each the row is still working when
     the eye has moved on — so that surface asks for a shorter one. */
  advanceSeconds?: number;
}

/* The mark arriving, as ink in water.
 *
 * The first version cross-faded all six frames across the whole card at once,
 * which is a picture coming into focus: every part of it resolves at the same
 * moment, nothing enters, nothing spreads. This one has the ink *arrive*. It
 * enters at a point and bleeds outward behind an irregular mask, and the frames
 * advance underneath it — so area revealed early is already resolving while the
 * leading edge is still the noise of frame one.
 *
 * The mask is six nested blobs, one per frame, each lagging the one outside it.
 * Drawing them largest-first means the outermost ring shows x1 and the oldest
 * centre shows x6, with the stages in between laid out as rings — which is what
 * ink actually looks like as it spreads and settles.
 *
 * The shape is a sum of harmonics rather than a circle, seeded off the archetype
 * so a given person's mark always arrives the same way. No clean wipe, no
 * geometric edge, nothing that reads as a transition someone chose from a list.
 */

const ANGLES = 240;          // points around the blob; more than the eye can count
const LAG = 0.115;           // how far each frame trails the one outside it
const SEED_AT = { x: 0.5, y: 0.6 };   // the drop lands low, and rises into the figure

/** Deterministic per archetype, so the same mark always arrives the same way. */
function seededPhases(slug: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) { h ^= slug.charCodeAt(i); h = Math.imul(h, 16777619); }
  return [0, 1, 2, 3].map((i) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    return ((h >>> (i * 3)) % 1000) / 1000 * Math.PI * 2;
  });
}

/** The blob's radius at each angle, as a multiple of its nominal radius. */
function blobProfile(slug: string): Float32Array {
  const [p1, p2, p3, p4] = seededPhases(slug);
  const r = new Float32Array(ANGLES);
  for (let i = 0; i < ANGLES; i++) {
    const t = (i / ANGLES) * Math.PI * 2;
    r[i] = 1
      + 0.26 * Math.sin(3 * t + p1)
      + 0.15 * Math.sin(5 * t + p2)
      + 0.09 * Math.sin(8 * t + p3)
      + 0.05 * Math.sin(13 * t + p4)
      /* A high harmonic at low amplitude: the edge is ragged at the scale of a
         few pixels, which is what keeps it from reading as a smooth vector
         shape on a card made of one-bit dots. */
      + 0.028 * Math.sin(31 * t + p1 * 2);
  }
  return r;
}

/* Heavy, slow, inevitable. Not power2.out — that is fast then settling, which is
   a splash. This starts gently, takes the middle at a steady rate and arrives
   without braking hard.

   Written as a matched pair either side of the midpoint. The first version was
   two curves that did not meet — 0.55 against 0.50 at t=0.5 — so the ink jumped
   outward by five percent of its reach in a single frame, halfway through the
   one move that is supposed to look inevitable. */
const SPREAD_P = 1.7;
function spread(t: number): number {
  const k = Math.pow(2, SPREAD_P - 1);
  return t < 0.5
    ? k * Math.pow(t, SPREAD_P)
    : 1 - k * Math.pow(1 - t, SPREAD_P);
}

export default function Crystallization({
  becoming, size, ready, onBegin, loop = false, onCycle, advanceSeconds,
}: Props) {
  const urls = markFrameUrls(becoming);
  const slug = markSlug(becoming ?? '');
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const run = ready && !!urls && !prefersReducedMotion() && !failed;

  useEffect(() => {
    if (!run || !urls) return;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    let stopped = false;
    let raf = 0;

    const images: HTMLImageElement[] = [];
    let loaded = 0;
    urls.forEach((src, i) => {
      const img = new Image();
      img.onload = () => { images[i] = img; if (++loaded === MARK_FRAMES) start(); };
      img.onerror = () => { if (!stopped) setFailed(true); };
      img.src = src;
    });

    const profile = blobProfile(slug);

    function start() {
      if (stopped) return;
      const ctx = canvas!.getContext('2d');
      if (!ctx) { setFailed(true); return; }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = box!.clientWidth, h = box!.clientHeight;
      if (!w || !h) { setFailed(true); return; }
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx.scale(dpr, dpr);

      const cx = w * SEED_AT.x, cy = h * SEED_AT.y;
      /* The smallest radius that covers the card, worked out per angle.
         Dividing the furthest corner by the profile's *minimum* — which is what
         this did first — sizes the blob for its narrowest direction in every
         direction, so it overshoots by nearly double and the card is full a
         second before the move ends. Asking each angle what it actually needs
         keeps the leading edge arriving until the last frame. */
      let maxR = 0;
      for (let i = 0; i < ANGLES; i++) {
        const t = (i / ANGLES) * Math.PI * 2;
        const dx = Math.cos(t), dy = Math.sin(t);
        /* Distance from the seed to the card's edge along this direction. */
        const tx = dx > 0 ? (w - cx) / dx : dx < 0 ? -cx / dx : Infinity;
        const ty = dy > 0 ? (h - cy) / dy : dy < 0 ? -cy / dy : Infinity;
        const edge = Math.min(tx, ty);
        if (Number.isFinite(edge)) maxR = Math.max(maxR, edge / profile[i]);
      }

      const path = (radius: number) => {
        const p = new Path2D();
        for (let i = 0; i < ANGLES; i++) {
          const t = (i / ANGLES) * Math.PI * 2;
          const rr = radius * profile[i];
          const x = cx + Math.cos(t) * rr, y = cy + Math.sin(t) * rr;
          if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
        }
        p.closePath();
        return p;
      };

      const began = performance.now();
      onBegin?.();

      /* The idle's three phases, in milliseconds from the first frame of ink.
         The dissolve runs the same path backwards and much faster, so the
         figure loses coherence and goes rather than rewinding — a collapse at
         a third of the speed it arrived at does not read as a film run in
         reverse. */
      const IN = (advanceSeconds ?? T.crystal.advance) * 1000;
      const HOLD = T.idle.hold * 1000;
      const OUT = T.idle.dissolve * 1000;

      const frame = () => {
        if (stopped) return;
        const ms = performance.now() - began;

        /* The card says which phase it is on. Inferring it from how much ink
           is on the canvas cannot work: the spread is eased, so it passes 90%
           of its final ink about two thirds of the way through, and a harness
           reading that as "arrived" measures a 2.2s spread as 1.5s and then
           credits the missing 0.7s to the hold. */
        let t: number;
        if (!loop) {
          t = Math.min(1, ms / IN);
        } else if (ms < IN) {
          t = ms / IN;
          canvas!.dataset.phase = 'spreading';
        } else if (ms < IN + HOLD) {
          t = 1;
          canvas!.dataset.phase = 'holding';
        } else {
          t = Math.max(0, 1 - (ms - IN - HOLD) / OUT);
          canvas!.dataset.phase = 'dissolving';
        }

        ctx.clearRect(0, 0, w, h);
        /* Largest first: the outer ring is the newest ink and still frame one,
           and every later frame is painted over the older ground inside it. */
        for (let i = 0; i < MARK_FRAMES; i++) {
          const delay = i * LAG;
          const local = (t - delay) / (1 - delay);
          if (local <= 0) continue;
          const img = images[i];
          if (!img) continue;
          ctx.save();
          if (local < 1) ctx.clip(path(maxR * spread(Math.min(1, local))));
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();
        }

        if (!loop) {
          if (t < 1) raf = requestAnimationFrame(frame);
          return;
        }
        /* The caller swaps the figure; this component does not choose one. */
        if (ms >= IN + HOLD + OUT) { onCycle?.(); return; }
        raf = requestAnimationFrame(frame);
      };
      frame();
    }

    return () => { stopped = true; cancelAnimationFrame(raf); };
    /* `loop` and the callbacks are read, not depended on: re-running this effect
       would restart the ink mid-spread. The slug changing is what starts a new
       card, and that is the only thing that should. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, slug]);

  /* The fallback, and frame six under another name. Its arrival belongs to
     whoever placed it — on the reveal that is the 400ms cross-fade. */
  if (!run || !urls) {
    return <ArchetypeMark becoming={becoming} size={size} />;
  }

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      style={{ width: size, aspectRatio: `${MARK_ASPECT}`, flex: 'none', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        data-crystallization=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
