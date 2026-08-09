import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================= *
 *  THE THRESHOLD — first-use entrance
 *  See docs/art-direction.md, Part II.
 *
 *  A sealed architectural aperture, not a door. CSS/SVG only —
 *  no WebGL, no canvas, no new dependencies. Everything animates
 *  on transform and opacity.
 * ============================================================= */

interface Props {
  /** Fires once the passage completes. */
  onEnter: () => void;
  /** Returning visitor — skip the beats, open on the composed still. */
  abbreviated?: boolean;
}

/* Ordered stages. The composition reveals one layer per step. */
const STEP = {
  VOID: 0,
  SEAM: 1,
  SEAL: 2,
  BEAT_1: 3,
  BEAT_2: 4,
  BEAT_3: 5,
  READY: 6,
} as const;

type Step = (typeof STEP)[keyof typeof STEP];

/* Flat timeline — every entry scheduled from mount, never chained.
   Totals ~6.6s to ENTER, inside the 8–12s ceiling. */
const TIMELINE: readonly (readonly [number, Step])[] = [
  [600, STEP.SEAM],
  [1200, STEP.SEAL],
  [2000, STEP.BEAT_1],
  [3600, STEP.BEAT_2],
  [5200, STEP.BEAT_3],
  [6600, STEP.READY],
] as const;

const DOCTRINE: Record<number, string> = {
  [STEP.BEAT_1]: 'SEE THE PATTERN.',
  [STEP.BEAT_2]: 'CHOOSE DIFFERENTLY.',
  [STEP.BEAT_3]: 'PROVE IT.',
  [STEP.READY]: 'PROVE IT.',
};

const PASSAGE_MS = 1500;
const PASSAGE_REDUCED_MS = 200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/* The seal: a thin ring bisected by the seam, with four registration
   ticks. Two halves so each can part independently. Provisional —
   inherits the real emblem verbatim when it exists. */
function Seal({ visible, opening }: { visible: boolean; opening: boolean }) {
  const cls = (base: string) => `${base}${visible ? ' sv-th-on' : ''}`;
  return (
    <svg
      className={cls('sv-th-seal')}
      data-opening={opening ? '' : undefined}
      width="48"
      height="48"
      viewBox="-24 -24 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path className="sv-th-seal-l" d="M 0,-22 A 22,22 0 0 0 0,22" />
      <path className="sv-th-seal-r" d="M 0,-22 A 22,22 0 0 1 0,22" />
      <g className="sv-th-ticks">
        <line x1="0" y1="-25" x2="0" y2="-28" />
        <line x1="0" y1="25" x2="0" y2="28" />
        <line x1="25" y1="0" x2="28" y2="0" />
        <line x1="-25" y1="0" x2="-28" y2="0" />
      </g>
    </svg>
  );
}

export default function ThresholdPage({ onEnter, abbreviated = false }: Props) {
  /* Reduced motion and returning visitors open on the composed still. */
  const [reduced] = useState(prefersReducedMotion);
  const skipCeremony = reduced || abbreviated;

  const [step, setStep] = useState<Step>(skipCeremony ? STEP.READY : STEP.VOID);
  const [opening, setOpening] = useState(false);

  /* Every timer lives here so skip, enter and unmount can all clear it. */
  const timers = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => {
    if (skipCeremony) return;
    timers.current = TIMELINE.map(([at, next]) =>
      window.setTimeout(() => setStep(next), at)
    );
    return clearTimers;
  }, [skipCeremony, clearTimers]);

  /* Unmount safety for the passage timer scheduled outside the effect above. */
  useEffect(() => clearTimers, [clearTimers]);

  /* The ceremony is never a gate: any tap jumps straight to ENTER-ready. */
  const handleSkip = useCallback(() => {
    if (opening || step === STEP.READY) return;
    clearTimers();
    setStep(STEP.READY);
  }, [opening, step, clearTimers]);

  const handleEnter = useCallback(() => {
    if (opening) return;
    clearTimers();
    setOpening(true);
    const id = window.setTimeout(
      onEnter,
      reduced ? PASSAGE_REDUCED_MS : PASSAGE_MS
    );
    timers.current = [id];
  }, [opening, clearTimers, onEnter, reduced]);

  const on = (from: Step) => (step >= from ? ' sv-th-on' : '');
  const line = DOCTRINE[step];

  return (
    <div
      className="sv-th-root"
      data-opening={opening ? '' : undefined}
      data-reduced={reduced ? '' : undefined}
      onPointerDown={step === STEP.READY || opening ? undefined : handleSkip}
    >
      <div className="sv-th-depth" aria-hidden="true" />
      <div className={`sv-th-glow${on(STEP.SEAM)}`} aria-hidden="true" />

      <div className="sv-th-column">
        <div className="sv-th-aperture">
          <div
            className={`sv-th-bloom${on(STEP.SEAM)}${step >= STEP.BEAT_2 ? ' sv-th-bright' : ''}`}
            aria-hidden="true"
          />
          <div
            className={`sv-th-seam${on(STEP.SEAM)}${step >= STEP.BEAT_2 ? ' sv-th-bright' : ''}`}
            aria-hidden="true"
          />
          <Seal visible={step >= STEP.SEAL} opening={opening} />
        </div>

        <div className="sv-th-slot" aria-live="polite">
          {line && (
            <span key={line} className="sv-th-line">
              {line}
            </span>
          )}
        </div>

        <div className="sv-th-enter-well">
          {step >= STEP.READY && (
            <button type="button" className="sv-th-enter" onClick={handleEnter}>
              Enter
            </button>
          )}
        </div>
      </div>

      <div className="sv-th-grain" aria-hidden="true" />
      <div className="sv-th-vignette" aria-hidden="true" />
    </div>
  );
}
