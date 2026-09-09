import { useEffect, useState } from 'react';
import { UNDO_WINDOW_SECONDS } from '../lib/ledger';

interface Props {
  /** Which way it was filed, so the line says what is on the record. */
  done: boolean;
  onUndo: () => void;
  onExpire: () => void;
}

/* The thirty seconds after filing.

   Both buttons write to a record that is meant to be permanent, so a mistaken
   tap on either one is a lie that cannot be corrected — the same failure as the
   one-button Ledger, reached from the other side. This is the only way back, it
   is brief, and it says plainly what was written.

   The countdown is a display of a window Postgres is already enforcing. If this
   timer drifted or a person left the tab open, the policy would still refuse. */
export default function FilingUndo({ done, onUndo, onExpire }: Props) {
  const [left, setLeft] = useState(UNDO_WINDOW_SECONDS);

  useEffect(() => {
    if (left <= 0) { onExpire(); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onExpire]);

  return (
    <div
      style={{
        marginTop: 16, borderTop: '1px solid #E4E0D6', paddingTop: 16,
        display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
      }}
    >
      <span style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: '#1A1A1A' }}>
        {done ? 'Filed as done.' : 'Filed. You didn’t do it, and that is on the record.'}
      </span>
      <button
        onClick={onUndo}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'var(--sv-font)', fontWeight: 400, fontSize: 15, color: '#1A1A1A',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        Undo
      </button>
      <span style={{ fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, color: '#6E6A66' }}>
        {left}s
      </span>
    </div>
  );
}
