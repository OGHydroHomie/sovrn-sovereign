import { useEffect, useRef, useState } from 'react';
import { MARK_ASPECT, markUrl, markFreedUrl } from '../lib/marks';
import { T, prefersReducedMotion } from '../lib/motion';
import ArchetypeMark from './ArchetypeMark';

interface Props {
  /** The figure's name, e.g. "The Devil". Both frames are derived from it. */
  becoming: string;
  size: number | string;
  /** Fired on the first frame of the fall, so the sequence can time against it. */
  onBegin?: () => void;
}

/* The binding falling away.
 *
 * Two frames of the same figure — one bound, one not — and the transition
 * between them masked from the binding's position downward, so the chain leaves
 * and the figure does not move. The only time a card ever moves.
 *
 * Where the binding starts is measured rather than declared. The two images
 * differ in exactly one place, which is the binding, so the topmost row that
 * differs *is* its position: no per-figure constant to tune, nothing to keep in
 * step when the art is redrawn, and it is correct for a figure whose binding is
 * a chain and for one whose binding is something else entirely.
 *
 * The single pulse afterwards is not a scale — the card is one-bit art and
 * growing it resamples the grain into mush. It is not a re-threshold either,
 * which is what this did first: the art is 1080px drawn into about 208, so what
 * is actually on the canvas is an anti-aliased grey, and thresholding that at
 * 128 turned a settled figure into hard noise for eight hundred milliseconds.
 * It read as a glitch, which is the one thing this moment cannot afford.
 *
 * What it does instead is breathe on the ink's weight — downward. The figure is
 * one-bit art, so virtually every ink pixel is already fully opaque and lifting
 * the alpha does nothing but clamp: the first attempt at this raised it 16% and
 * moved the total ink by two tenths of one percent, which is to say it did not
 * happen. Letting the ink recede and return is the same gesture in the only
 * direction the material allows, and nothing moves or hardens either way.
 */
export default function Unbinding({ becoming, size, onBegin }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [usable, setUsable] = useState<boolean | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const bound = markUrl(becoming);
    const freed = markFreedUrl(becoming);
    if (!bound || !freed) { setUsable(false); return; }

    let stopped = false;
    let raf = 0;

    const load = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => (img.decode ? img.decode().then(() => resolve(img), () => resolve(img)) : resolve(img));
      /* A missing freed frame is the expected state until the art lands, and it
         has to degrade to the bound card sitting still rather than to a broken
         image on the one moment this is built for. */
      img.onerror = () => resolve(null);
      img.src = src;
    });

    void Promise.all([load(bound), load(freed)]).then(([a, b]) => {
      if (stopped) return;
      if (!a || !b) { setUsable(false); return; }
      setUsable(true);

      const canvas = canvasRef.current;
      const box = boxRef.current;
      if (!canvas || !box) return;

      const w = Math.max(1, Math.round(box.getBoundingClientRect().width));
      const h = Math.round(w / MARK_ASPECT);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      /* Where the two pictures start disagreeing. Sampled on a small offscreen
         pair rather than at full resolution — this is looking for the first row
         with a meaningful difference, and 120px of width is plenty to find it. */
      const SW = 120, SH = Math.round(SW / MARK_ASPECT);
      const scratch = document.createElement('canvas');
      scratch.width = SW; scratch.height = SH * 2;
      const sx = scratch.getContext('2d', { willReadFrequently: true })!;
      sx.drawImage(a, 0, 0, SW, SH);
      sx.drawImage(b, 0, SH, SW, SH);
      const boundPx = sx.getImageData(0, 0, SW, SH).data;
      const freedPx = sx.getImageData(0, SH, SW, SH).data;

      let bindingRow = 0;
      for (let y = 0; y < SH; y++) {
        let diff = 0;
        for (let x = 0; x < SW; x++) {
          const i = (y * SW + x) * 4;
          if (Math.abs(boundPx[i] - freedPx[i]) > 40 || Math.abs(boundPx[i + 3] - freedPx[i + 3]) > 40) diff++;
        }
        if (diff > SW * 0.02) { bindingRow = y; break; }
      }
      const bindingY = bindingRow / SH;

      const draw = (progress: number, breath: number) => {
        ctx.clearRect(0, 0, w, h);
        /* Freed underneath, bound on top, and the bound layer clipped to what
           the fall has not yet reached. Above the binding the two are identical,
           so nothing there appears to change at all. */
        ctx.drawImage(b, 0, 0, w, h);
        const front = bindingY * h + (1 - bindingY) * h * progress;
        if (progress < 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, front, w, h - front);
          ctx.clip();
          ctx.drawImage(a, 0, 0, w, h);
          ctx.restore();
        }
        if (breath !== 0) {
          /* The pulse. One pass, and it only touches how much of the ink is
             there — never where it is, never how hard its edges are. */
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = img.data;
          /* Down, not up: 255 * 1.16 is 255. */
          const k = 1 - breath;
          for (let i = 3; i < d.length; i += 4) {
            if (d[i] < 4) continue;
            d[i] = Math.max(0, Math.min(255, d[i] * k));
          }
          ctx.putImageData(img, 0, 0);
        }
      };

      if (reduced) { draw(1, 0); return; }

      const t = T.unbind;
      const began = performance.now();
      onBegin?.();
      /* The card says which beat it is on.
         Every harness that has measured this product by inferring phases from
         pixels has eventually measured the wrong window — the pulse was read
         inside the fall, because ink is falling in both and the numbers do not
         say which is which. The thing under test knows; it can say so. */
      const phase = (name: string) => { canvas.dataset.phase = name; };

      const frame = () => {
        if (stopped) return;
        const ms = performance.now() - began;
        /* Still, as it has been, before anything happens. */
        if (ms < t.stillMs) { phase('still'); draw(0, 0); raf = requestAnimationFrame(frame); return; }

        const fall = Math.min(1, (ms - t.stillMs) / t.fallMs);
        /* Eased out: the binding lets go and then drops away, rather than
           travelling at a constant speed like a wipe. */
        const eased = 1 - (1 - fall) ** 3;

        let breath = 0;
        const pulseAt = t.stillMs + t.fallMs;
        phase(ms < pulseAt ? 'falling' : ms < pulseAt + t.pulseMs ? 'pulse' : 'settled');
        if (ms > pulseAt) {
          const p = Math.min(1, (ms - pulseAt) / t.pulseMs);
          /* Up and back down once, on a sine, so there is no edge anywhere in
             it — the figure settles rather than blinking. */
          breath = Math.sin(p * Math.PI) * t.pulseDepth;
        }

        draw(eased, breath);
        if (ms < pulseAt + t.pulseMs) raf = requestAnimationFrame(frame);
        else { phase('settled'); draw(1, 0); }
      };
      frame();
    });

    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [becoming, reduced, onBegin]);

  /* No freed frame yet, or either file missing: the bound card, still. The
     line and the act still arrive on their beats — the ceremony reads without
     the fall, it just does not have it. */
  if (usable === false) return <ArchetypeMark becoming={becoming} size={size} />;

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      style={{ width: size, aspectRatio: `${MARK_ASPECT}`, flex: 'none', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        data-unbinding=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
