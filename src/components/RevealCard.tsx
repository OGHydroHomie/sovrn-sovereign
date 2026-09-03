import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface Props {
  header: string;
  teaser: string;
  /** Stagger index — cards enter ~150ms apart. */
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
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut', delay: 0.15 * index }}
      style={{ borderTop: '1px solid #E4E0D6' }}
    >
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={reduceMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: 26 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
