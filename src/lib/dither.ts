/* Floyd-Steinberg error diffusion, the same kernel the archetype marks were
   processed with: one bit out, error pushed 7/16 right, 3/16 down-left, 5/16
   down, 1/16 down-right.

   The marks were dithered offline at pixel scale 2 with a black floor. This does
   the same thing at runtime, which is the only way the quiz background can be a
   field that changes rather than a picture that loads — but it means the cost is
   paid on someone's phone, so everything here is arranged to keep it small. The
   buffer is the viewport divided by the pixel scale, so a 430x800 screen at
   scale 4 is 107x200 — twenty-one thousand pixels, not three hundred and forty
   thousand — and it is drawn back up with smoothing off, which is what gives the
   chunky 1-bit edge the rest of the art has. */

/** 0 is black, 1 is paper. Called once per buffer pixel, so keep it cheap. */
export type Sample = (x: number, y: number) => number;

export interface Field {
  /** Buffer dimensions, in dithered pixels rather than device pixels. */
  w: number;
  h: number;
  /** One byte per pixel: 0 black, 255 paper. */
  bits: Uint8Array;
}

export function makeField(w: number, h: number): Field {
  return { w, h, bits: new Uint8Array(w * h) };
}

/**
 * Dither `sample` into `field`.
 *
 * The error row buffers are allocated per call rather than held, because the
 * whole point of the low-frequency tick is that this runs a handful of times a
 * second; two Float32Arrays of a few hundred entries cost nothing next to that,
 * and not holding them means the field can be resized without invalidating
 * state that lives somewhere else.
 */
export function dither(field: Field, sample: Sample): void {
  const { w, h, bits } = field;
  /* Error is carried on two rows only. A full-image error buffer would be the
     obvious way to write this and would allocate a megabyte per tick. */
  let curr = new Float32Array(w + 2);
  let next = new Float32Array(w + 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wanted = sample(x, y) + curr[x + 1];
      const out = wanted < 0.5 ? 0 : 1;
      bits[y * w + x] = out ? 255 : 0;

      const err = wanted - out;
      curr[x + 2] += err * (7 / 16);
      next[x] += err * (3 / 16);
      next[x + 1] += err * (5 / 16);
      next[x + 2] += err * (1 / 16);
    }
    const spent = curr;
    curr = next;
    next = spent;
    next.fill(0);
  }
}

/** Paint a dithered field into an ImageData, black on the given paper colour. */
export function toImageData(field: Field, out: ImageData, paper: [number, number, number]): void {
  const { bits } = field;
  const px = out.data;
  const [pr, pg, pb] = paper;
  for (let i = 0, p = 0; i < bits.length; i++, p += 4) {
    const on = bits[i];
    px[p] = on ? pr : 0;
    px[p + 1] = on ? pg : 0;
    px[p + 2] = on ? pb : 0;
    px[p + 3] = 255;
  }
}

/* A cheap value-noise field. Not simplex — this is sampled a few thousand times
   per tick and needs to be boring and fast, not beautiful. Deterministic in x, y
   and phase, so a drift is just a moving phase rather than stored state. */
export function noise(x: number, y: number, phase: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + phase * 0.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Value noise smoothed over a 2x2 cell, which reads as clumping rather than TV static. */
export function softNoise(x: number, y: number, phase: number, cell: number): number {
  const gx = x / cell, gy = y / cell;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const a = noise(x0, y0, phase), b = noise(x0 + 1, y0, phase);
  const c = noise(x0, y0 + 1, phase), d = noise(x0 + 1, y0 + 1, phase);
  /* Smoothstep on the cell fraction. Linear blending leaves visible seams at
     cell boundaries, which at this pixel scale look like a grid. */
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/**
 * Punch a hole in a dithered field.
 *
 * Error diffusion cannot be asked politely to leave an area alone. Pushing the
 * source level toward a pole thins the dots but never removes them — at 94% of
 * the way to paper there is still roughly one dot in twenty landing on the
 * letterforms, and a question set over one-in-twenty is a question people squint
 * at. The only way to have nothing render over the words is to have nothing
 * there: set the pixels after the dither has run.
 *
 * `feather` softens the edge by a few pixels so the hole does not read as a
 * pasted rectangle; inside that margin, pixels are only cleared if the dither
 * left them at the value being cleared to anyway.
 */
export function punch(
  field: Field,
  box: { x0: number; y0: number; x1: number; y1: number },
  value: 0 | 255,
  feather = 3,
  /* How completely the hole is enforced, 0 to 1. At rest this is 1 and the hole
     is absolute. It is only lowered while the hole is changing which colour it
     is — mid-move, with the question faded out — so that a solid block dissolves
     into its opposite instead of snapping between them in one frame. */
  strength = 1,
): void {
  const { w, h, bits } = field;
  const x0 = Math.max(0, Math.floor(box.x0)), x1 = Math.min(w, Math.ceil(box.x1));
  const y0 = Math.max(0, Math.floor(box.y0)), y1 = Math.min(h, Math.ceil(box.y1));
  if (x1 <= x0 || y1 <= y0) return;

  for (let y = y0; y < y1; y++) {
    /* Distance into the box, in pixels, on whichever edge is nearest. */
    const dy = Math.min(y - y0, y1 - 1 - y);
    for (let x = x0; x < x1; x++) {
      const dx = Math.min(x - x0, x1 - 1 - x);
      const d = Math.min(dx, dy);
      const i = y * w + x;
      /* An ordered threshold, so both the feathered edge and a partial strength
         dissolve rather than banding. */
      const ord = ((x * 7 + y * 13) % 16) / 16;
      const edge = d >= feather ? 1 : (d + 1) / (feather + 1);
      if (ord < edge * strength) bits[i] = value;
    }
  }
}
