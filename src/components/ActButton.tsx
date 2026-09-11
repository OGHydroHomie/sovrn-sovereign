import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { T, prefersReducedMotion } from '../lib/motion';

interface Props {
  label: string;
  body: string;
  committing: boolean;
  disabled?: boolean;
  onCommit: () => void;
}

/* The act card, and the one piece of feedback the product gives for committing.

   A hairline traces the border from the top left and closes the circuit in
   280ms; the card inverts for 60ms as it lands; it settles at 340ms. Nothing
   bounces, nothing lingers, nothing congratulates. The reading is a switch
   closing — something was decided and the thing registered it — which is why it
   is sharp and why it is over almost immediately.

   The spark runs on tap, not on the write completing. Committing is a decision
   the person made; it should not feel like it is waiting for permission from a
   server, and a slow network must not make the moment arrive late.

   Under prefers-reduced-motion the trace is dropped and the inverse flash
   remains. The flash is the part that says it registered. */
export default function ActButton({ label, body, committing, disabled, onCommit }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const outline = useRef<SVGRectElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  /* The trace has to be the size of the card, and the card's height depends on
     how long the act is and how it wraps. */
  useEffect(() => {
    const el = button.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = { w: Math.round(r.width), h: Math.round(r.height) };
      setBox((prev) => (prev && prev.w === next.w && prev.h === next.h ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [body]);

  /* Hidden once, by the thing that will later show it. */
  useEffect(() => {
    if (outline.current) gsap.set(outline.current, { opacity: 0 });
  }, [box]);

  const play = () => {
    const reduced = prefersReducedMotion();
    const card = button.current;
    if (!card) return;

    const tl = gsap.timeline();

    if (!reduced && outline.current && box) {
      const rect = outline.current;
      /* getTotalLength is the honest measurement; the perimeter is the fallback
         for anything that will not give it for a rect. */
      let length = 0;
      try { length = rect.getTotalLength(); } catch { length = 0; }
      if (!length) length = 2 * (box.w - 1) + 2 * (box.h - 1);

      gsap.set(rect, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 });
      tl.to(rect, { strokeDashoffset: 0, duration: T.commit.trace, ease: 'power1.inOut' }, 0);
    }

    const at = reduced ? 0 : T.commit.trace;
    tl.call(() => card.classList.add('sv-commit-flash'), undefined, at);
    tl.call(() => {
      card.classList.remove('sv-commit-flash');
      if (outline.current) gsap.set(outline.current, { opacity: 0 });
    }, undefined, at + T.commit.flash);
  };

  return (
    <button
      ref={button}
      onClick={() => { play(); onCommit(); }}
      disabled={disabled}
      style={{
        position: 'relative',
        display: 'block', width: '100%', textAlign: 'left',
        background: 'none', border: '1px solid #1A1A1A', borderRadius: 2,
        padding: '20px 18px 22px', marginTop: 14,
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: 'var(--sv-font)',
      }}
    >
      {/* The trace. Sits on the border, draws from the top left, and is invisible
          until the moment it runs. */}
      {box && (
        <svg
          width={box.w}
          height={box.h}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {/* No opacity in the style prop. React reapplies whatever is there on
              every render, and a render lands mid-trace the moment `committing`
              flips — which reset the rect to invisible and left the line drawing
              where nobody could see it. GSAP owns this property now, start to
              finish, and hides it on mount. */}
          <rect
            ref={outline}
            x={0.5} y={0.5} width={Math.max(0, box.w - 1)} height={Math.max(0, box.h - 1)}
            rx={2}
            fill="none" stroke="#000000" strokeWidth={1}
          />
        </svg>
      )}

      <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#6E6A66' }}>
        {label}
      </span>
      <span style={{ display: 'block', marginTop: 10, fontSize: 'clamp(18px, 4.8vw, 21px)', lineHeight: 1.45, fontWeight: 400, color: '#000000' }}>
        {body}
      </span>
      <span style={{ display: 'block', marginTop: 16, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#000000' }}>
        {committing ? 'COMMITTING...' : 'I COMMIT'}
      </span>
    </button>
  );
}
