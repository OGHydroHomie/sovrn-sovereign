import { noise, softNoise, type Sample } from './dither';

/* The climb, as a field.
 *
 * Four altitudes, and a single continuous coordinate `a` running 0 → 3 between
 * them. Everything the background does — how much ink is on the screen, where
 * the horizon sits, how far the ground has fallen away — is a function of that
 * one number, which is what makes the density interpolate continuously during a
 * move instead of stepping between four presets. Moving `a` is the whole
 * transition.
 *
 *   0  the fear          the depths      near-solid, clumped, slow drift
 *   1  the life you want ground level    thinner, a horizon appears
 *   2  the pattern       above it        sparse, the ground far below
 *   3  birth details     the stars       isolated points on near-black
 *
 * Both ends are dark and the middle is light, which is not a mistake: the depths
 * are dark because the ink is nearly solid, and the stars are dark because the
 * ink is nearly solid. What differs is what the gaps mean — clumps of pressure
 * at the bottom, single points of light at the top.
 *
 * Worth being exact about, because DESIGN_FROZEN.md says the page is never dark:
 * nothing here introduces a dark background colour. Every pixel is black ink or
 * paper, which is the palette the document already describes as "black line art
 * on the paper". At altitude 0 and 3 the ink simply covers most of it. The page
 * is still paper; there is just a great deal on it.
 */

/** Above this the screen reads as dark and the type inverts to paper. */
export const DARK_AT = 0.5;

/** Ink coverage at each of the four altitudes — the fraction of pixels set black. */
export const COVERAGE = [0.90, 0.45, 0.12, 0.96] as const;

export const ALTITUDES = COVERAGE.length;      // 4
export const TOP = ALTITUDES - 1;              // a runs 0..3

/** Triangular basis: each altitude's influence, falling to zero one step away. */
function weights(a: number): number[] {
  const w: number[] = [];
  for (let i = 0; i < ALTITUDES; i++) w.push(Math.max(0, 1 - Math.abs(a - i)));
  const total = w.reduce((s, n) => s + n, 0) || 1;
  return w.map((n) => n / total);
}

export interface FieldOpts {
  /** Buffer size, in dithered pixels. */
  w: number;
  h: number;
  /** Where on the climb, 0..3, continuous. */
  a: number;
  /* A move in progress: where it started, and how far through it is.
   *
   * Without this the two altitudes cross-fade globally, so every row of the
   * screen shows the same blend and the midpoint of any move is a full screen of
   * 50% dither — the densest, noisiest thing the field can produce, and on the
   * way down from the stars it reads as a blow-out to white. It is also not what
   * the move is supposed to be: the field descends *past the viewport*, so the
   * altitude someone is arriving at should enter from the top and push the one
   * they are leaving down and off the bottom.
   *
   * With it, each row is at a definite altitude and a soft boundary sweeps down
   * the screen. The density still interpolates continuously — in space as well
   * as in time — and never passes through a uniform half-tone. */
  from?: number;
  progress?: number;
  /** Advances slowly so the field breathes. Frozen under reduced motion. */
  phase: number;
  /* Reduced motion. The field still changes density between altitudes — that is
     the information, not the decoration — but nothing translates: the texture
     does not scroll and the horizon does not descend. What is left is a
     cross-fade between two densities, which is movement of tone rather than
     movement of anything across the screen. */
  still?: boolean;
  /* The paper arriving, as a front that travels outward from a point.
   *
   * Not a uniform lift toward paper: pushing the whole field's level up at once
   * walks every pixel on screen through the middle of the scale together, which
   * is a full-screen halftone churning at the redraw rate. It reads as static,
   * and it is the opposite of the stillness the screen before it spent six
   * seconds earning.
   *
   * A front instead. Inside it the field is paper and there is nothing at all;
   * outside it the field is untouched and frozen. Only the boundary moves, so no
   * dot anywhere is ever reassigned — which is what makes the paper look like it
   * is arriving rather than like the image is degrading. */
  dissolveAt?: { x: number; y: number };
  dissolveProgress?: number;
  /* The words have to stay readable at every altitude, so the field is pushed
     away from the middle through a band across the screen — toward paper where
     the screen is light, toward solid ink where it is dark. Clearing alone
     cannot work at both ends: at the stars it would be fighting 98% ink and
     lose. Pushing to whichever pole the altitude is already at gives the type
     something absolute to sit on either way, and costs the composition nothing
     — at the depths a solid centre is more pressing, not less. */
  clearCentre?: number;
  clearHalf?: number;
  clearStrength?: number;
  /* Which pole the band is pushed to: 0 solid ink, 1 paper. Continuous, and
     supplied by the caller so it can be eased over time. Derived from the
     altitude when absent, which is what the offline renderer does.

     It has to be continuous because switching it in one frame moves a third of
     the screen between two extremes in that frame — measured at 0.263 of total
     ink in a single step, which is a flash, and precisely the stepping the
     transition is meant not to do. */
  pole?: number;
}

/**
 * Build the sampler for one altitude value.
 *
 * Returns paper level: 0 is black, 1 is untouched paper. The dither turns this
 * into the one-bit field; this only has to describe what the climb looks like.
 */
export function ascentSample(o: FieldOpts): Sample {
  const { w, h, a, phase } = o;
  const clearCentre = o.clearCentre ?? 0.46;
  const clearHalf = o.clearHalf ?? 0.30;
  const clearStrength = o.clearStrength ?? 0.94;
  /* How wide the boundary between the two altitudes is, as a fraction of the
     screen. Narrow enough to read as an edge coming down, wide enough that it is
     a gradient rather than a line. */
  const BAND = 0.42;
  const from = o.from;
  const p = o.progress;
  const moving = from !== undefined && p !== undefined && from !== a;

  /* Which pole the band is pushed to, and therefore what colour the type is.
     The switch falls at a ≈ 0.75 and a ≈ 2.4 — both of them mid-move, where the
     question text is already faded out. The type never changes colour while
     anyone can see it happen. */
  const pole = o.pole ?? (inkAt(a) > DARK_AT ? 0 : 1);

  return (x, y) => {
    const v = y / h;
    const u = x / w;

    /* The altitude at this row. Uniform at rest; during a move the arriving
       altitude occupies the top of the screen and the boundary sweeps down. */
    let rowA = a;
    if (moving && !o.still) {
      /* Climbing, the world moves down: the altitude being arrived at enters at
         the top and pushes the old one off the bottom. Going back down it is the
         exact reverse — the ground comes up to meet you, so the boundary sweeps
         from the bottom upward. Running it top-down in both directions makes
         going back feel like more of the same climb rather than its undoing. */
      const rising = a > from;
      const along = rising ? v : 1 - v;
      const edge = p * (1 + BAND);
      const mix = Math.max(0, Math.min(1, (edge - along) / BAND));
      rowA = from + (a - from) * mix;
    }

    const wt = weights(rowA);
    /* The texture scrolls a full screen per altitude, downward as it rises. The
       sensation is rising, so the world moves down. */
    const ny = y - (o.still ? 0 : rowA * h);

    let level = 0;

    // ── 0 · the depths ──────────────────────────────────────────────────────
    if (wt[0] > 0) {
      /* Two octaves and a floor, which is what makes this clump instead of
         speckle. Dithering a level that sits near 0.1 everywhere produces an
         even lattice of dots — perfectly correct error diffusion, and the exact
         opposite of "heavy, near-solid". The source has to have real spatial
         variance for the output to have any: most of the field is pinned at
         solid black by the subtraction, and only the upper tail of the noise
         survives into visible grain. */
      const n = 0.66 * softNoise(x, ny, phase, 9) + 0.34 * softNoise(x, ny, phase, 3.4);
      const grain = Math.max(0, n - 0.40) * 1.25;
      /* Darker toward the edges: the walls are closer than the middle. */
      const edge = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
      const press = 1 - 0.62 * edge * edge;
      level += wt[0] * Math.max(0, grain * press);
    }

    // ── 1 · ground level ────────────────────────────────────────────────────
    if (wt[1] > 0) {
      /* A horizon, which is the first structure the climb has shown. It sits in
         world space, so it descends with everything else. */
      const horizon = 0.62 + (o.still ? 0 : (rowA - 1) * 1.0);
      const across = Math.tanh((v - horizon) * 9);        // -1 above, +1 below
      const sky = 0.78, land = 0.26;
      const base = sky + (land - sky) * (across * 0.5 + 0.5);
      const n = softNoise(x, ny, phase, 2.1);
      level += wt[1] * Math.max(0, base - 0.22 + 0.34 * n);
    }

    // ── 2 · above it ────────────────────────────────────────────────────────
    if (wt[2] > 0) {
      /* Open space, with what is left of the ground gathered at the bottom. */
      const below = Math.max(0, v - (0.74 + (o.still ? 0 : (rowA - 2) * 1.0)));
      const n = softNoise(x, ny, phase, 1.6);
      level += wt[2] * Math.max(0, 0.97 - 2.6 * below - 0.11 * n);
    }

    // ── 3 · the stars ───────────────────────────────────────────────────────
    if (wt[3] > 0) {
      /* Isolated points on near-black, and isolated is the whole job. A smoothed
         noise gives clusters; a per-pixel hash gives single points, which is what
         a star is. Roughly one pixel in two hundred, with a second rarer cut for
         the few that are brighter than the rest. */
      const h1 = noise(x, ny, phase * 0.15);
      const star = h1 > 0.9955 ? 1 : h1 > 0.988 ? 0.55 : 0;
      level += wt[3] * Math.min(1, 0.012 + star);
    }

    /* The band the question sits in, pushed to the nearer pole.

       A plateau, not a peak. With a falloff that starts at the centre, the
       heading — which sits near the top of the block, not in the middle of it —
       lands where only a fifth of the clearing applies, and reads through 20%
       dither. Full strength across the block itself, and the softening happens
       outside it. */
    const d = Math.abs(v - clearCentre) / clearHalf;
    if (d < 1) {
      const FLAT = 0.62;
      const e = d <= FLAT ? 0 : (d - FLAT) / (1 - FLAT);
      const soft = 1 - e * e * (3 - 2 * e);
      level = level + (pole - level) * clearStrength * soft;
    }

    const origin = o.dissolveAt;
    const dp = o.dissolveProgress;
    if (origin && dp !== undefined && dp > 0) {
      /* Distance in screen fractions, corrected so the front is round on screen
         rather than round in buffer space. */
      const aspect = w / h;
      const dxs = (u - origin.x) * aspect;
      const dys = v - origin.y;
      const dist = Math.sqrt(dxs * dxs + dys * dys);
      const ang = Math.atan2(dys, dxs);
      /* The front is not a circle. Same idea as the ink's edge: a few harmonics,
         so what arrives has a shape rather than a radius. */
      const wob = 1
        + 0.16 * Math.sin(3 * ang + 1.1)
        + 0.09 * Math.sin(5 * ang + 2.7)
        + 0.05 * Math.sin(9 * ang + 0.4);
      /* Just far enough to clear the furthest corner in the narrowest direction
         the wobble produces, and no further. Oversizing it — the first attempt
         used 1.45 — means the screen is paper a full second before the ink has
         finished, and the two stop being one event. */
      const reach = 0.78 * dp * wob;
      const feather = 0.10;
      if (dist < reach) {
        const edge = Math.min(1, (reach - dist) / feather);
        level = level + (1 - level) * edge;
      }
    }

    return level < 0 ? 0 : level > 1 ? 1 : level;
  };
}

/**
 * How dark the screen is at a given altitude, 0 (paper) to 1 (solid ink).
 *
 * The question text is drawn over this, so it decides whether the type is black
 * or cream. Derived from the same COVERAGE table the field is built from rather
 * than measured off the canvas, because the type has to change colour on the
 * same curve the density does and a frame late reads as a flicker.
 */
export function inkAt(a: number): number {
  const wt = weights(a);
  let c = 0;
  for (let i = 0; i < ALTITUDES; i++) c += wt[i] * COVERAGE[i];
  return c;
}

/** What colour the question text has to be at this point on the climb. */
export function typeIsPaper(a: number): boolean {
  return inkAt(a) > DARK_AT;
}

/* The phase the field was frozen at when the loading screen handed over.
 *
 * The reveal opens on the same black the loading screen ended on, which means
 * literally the same field — same altitude, same drift phase, frozen. The phase
 * is the only part of that which is not derivable, because it is however far the
 * drift happened to travel during a wait of unknown length, so it is written
 * down at the moment everything stops and read back one mount later. */
let handoverPhase = 0;
export function setHandoverPhase(p: number): void { handoverPhase = p; }
export function getHandoverPhase(): number { return handoverPhase; }
