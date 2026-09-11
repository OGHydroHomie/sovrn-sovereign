import type { ReactNode } from 'react';
import Wordmark from './Wordmark';

interface Props {
  /** Shown between the mark and the link. Omitted when there is no reading yet. */
  becoming?: string | null;
  /** The link to the other view. */
  children?: ReactNode;
  /** Rides along with the page instead of pinning to the top. */
  sticky?: boolean;
}

const LINK: React.CSSProperties = {
  fontFamily: 'var(--sv-font)', fontSize: 13, fontWeight: 300,
  color: '#1A1A1A', textDecoration: 'underline', textUnderlineOffset: 3,
  whiteSpace: 'nowrap',
};

/* The way out, on every surface a signed-in person can reach.
   Left is home, right is the other view, and the becoming sits between them so
   the header still says whose page this is once the name has scrolled away. */
export default function SurfaceNav({ becoming, children, sticky = false }: Props) {
  return (
    <div
      style={{
        ...(sticky
          ? { position: 'sticky', top: 0, zIndex: 10, background: '#FBFAF7' }
          : {}),
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 0 12px',
        borderBottom: '1px solid #E8E6E1',
      }}
    >
      <a
        href="/"
        aria-label="SOVRN"
        style={{ textDecoration: 'none', flex: 'none', lineHeight: 1 }}
      >
        <Wordmark />
      </a>

      {becoming && (
        <span
          style={{
            flex: 1, minWidth: 0, textAlign: 'center',
            fontFamily: 'var(--sv-font)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', color: '#6E6A66',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {becoming}
        </span>
      )}

      <span style={{ marginLeft: becoming ? 0 : 'auto', flex: 'none' }}>{children}</span>
    </div>
  );
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} style={LINK}>{children}</a>;
}
