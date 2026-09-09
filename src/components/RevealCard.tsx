import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { EASE, T, prefersReducedMotion } from '../lib/motion';

interface Props {
  header: string;
  teaser: string;
  /** Stagger index — cards enter T.cards.stagger apart. */
  index: number;
  children: ReactNode;
}

/* Black line art on paper: a hairline rule, no fill, no shadow. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.28s ease', flexShrink: 0 }}
    >
      <path d="M3 5.5L7 9.5L11 5.5" stroke="#1A1A1A" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export default function RevealCard({ header, teaser, index, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  /* Entry: the three arrive in order, behind the header. */
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      gsap.fromTo(root.current,
        { opacity: 0, y: reduced ? 0 : T.cards.riseFrom },
        {
          opacity: 1, y: 0,
          duration: reduced ? 0.01 : T.cards.enter,
          delay: reduced ? 0 : T.cards.firstAt + T.cards.stagger * index,
          ease: EASE.in,
        });
    }, root);
    return () => ctx.revert();
  }, [index]);

  /* Open and close on a measured height.

     The panel is always mounted and clipped to zero when closed, so the height
     is measurable at the moment it is needed rather than after a mount. It
     animates to the content's own height and is then released to auto, which is
     what keeps a card correct when the text inside it reflows. */
  useLayoutEffect(() => {
    const el = panel.current;
    if (!el) return;

    /* The panel's opacity is never touched. It was set to 0 here on mount and
       nothing ever set it back — only the body inside it was faded in, and a
       body at opacity 1 inside a panel at opacity 0 is still invisible. Every
       card opened to nothing, in every browser. Height clips; the body fades;
       the panel does neither. */
    if (prefersReducedMotion()) {
      gsap.set(el, { height: open ? 'auto' : 0 });
      gsap.set(body.current, { opacity: open ? 1 : 0 });
      first.current = false;
      return;
    }

    if (first.current) {
      gsap.set(el, { height: 0 });
      gsap.set(body.current, { opacity: 0 });
      first.current = false;
      return;
    }

    gsap.killTweensOf([el, body.current]);
    {
      if (open) {
        const tl = gsap.timeline();
        tl.fromTo(el,
          { height: el.offsetHeight },
          {
            height: 'auto', duration: T.cards.expand, ease: EASE.panel,
            onComplete: () => gsap.set(el, { height: 'auto' }),
          }, 0);
        tl.fromTo(body.current, { opacity: 0 },
          { opacity: 1, duration: T.cards.bodyFade, ease: EASE.in }, T.cards.bodyAt);
      } else {
        const tl = gsap.timeline();
        tl.to(body.current, { opacity: 0, duration: T.cards.bodyFade * 0.6, ease: EASE.panel }, 0);
        tl.to(el, { height: 0, duration: T.cards.collapse, ease: EASE.panel }, 0);
      }
    }

    // Tweens are killed rather than reverted. gsap.context().revert() undoes the
    // properties the tween set, which on a re-run meant undoing the height it had
    // just animated to.
    return () => { gsap.killTweensOf([el, body.current]); };
  }, [open]);

  return (
    <div ref={root} style={{ borderTop: '1px solid #E4E0D6', opacity: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          width: '100%', minHeight: 64, padding: '18px 2px',
          background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
          fontFamily: 'var(--sv-font)',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
              color: '#1A1A1A',
            }}
          >
            {header}
          </span>
          <span
            style={{
              display: 'block', marginTop: 6, fontSize: 14, lineHeight: 1.5, fontWeight: 300,
              color: '#6E6A66',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {teaser}
          </span>
        </span>
        <Chevron open={open} />
      </button>

      <div id={panelId} ref={panel} style={{ overflow: 'hidden', height: 0 }}>
        <div ref={body} style={{ paddingBottom: 26 }}>{children}</div>
      </div>
    </div>
  );
}
