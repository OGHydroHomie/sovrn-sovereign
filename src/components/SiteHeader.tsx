import { useEffect, useState } from 'react';
import Wordmark from './Wordmark';
import { hasReading } from '../lib/reading';

const PAPER = '#FBFAF7';
const MUTED = 'rgba(251,250,247,0.72)';
const RULE = 'rgba(251,250,247,0.12)';

const LINK: React.CSSProperties = {
  fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13,
  color: MUTED, textDecoration: 'none', whiteSpace: 'nowrap',
};

/* The header for the dark surfaces.
 *
 * The wordmark, and two ways out. The app's own header is paper and carries a
 * becoming between them; this is the same treatment on the other ground, for
 * somebody who does not have a becoming yet.
 *
 * On the page it already points at, the wordmark is not a link. A link to where
 * you are is a control that does nothing, and a stranger who taps it learns
 * only that it was not worth tapping.
 */
export default function SiteHeader({ here }: { here?: string }) {
  /* A session is not a Ledger — the rule lives in lib/reading and is the same
     one the way-back-in at the foot of the page uses. Until it answers, the
     link says "Begin", which is the honest thing to offer a stranger and the
     honest thing to offer somebody whose session is still being read. */
  const [reading, setReading] = useState(false);
  useEffect(() => {
    let live = true;
    void hasReading().then((yes) => { if (live) setReading(yes); });
    return () => { live = false; };
  }, []);

  const home = here === '/';

  return (
    <header
      data-site-header=""
      style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 22px 13px',
        background: '#000000',
        borderBottom: `1px solid ${RULE}`,
      }}
    >
      {home ? (
        <span data-wordmark="inert" style={{ flex: 'none', lineHeight: 1 }}><Wordmark /></span>
      ) : (
        <a data-wordmark="link" href="/" style={{ textDecoration: 'none', flex: 'none', lineHeight: 1 }}>
          <Wordmark />
        </a>
      )}

      <nav style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
        <a data-nav="wall" href="/wall" style={LINK}>The Wall</a>
        {reading ? (
          <a data-nav="ledger" href="/ledger" style={{ ...LINK, color: PAPER }}>Your Ledger</a>
        ) : (
          <a data-nav="begin" href="/begin" style={{ ...LINK, color: PAPER }}>Begin</a>
        )}
      </nav>
    </header>
  );
}
