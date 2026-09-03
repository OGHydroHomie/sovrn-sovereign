import type { ReactNode } from 'react';

interface Props {
  title: string;
  /* Rendered under the title in smaller type — e.g. a last-updated line. */
  standfirst?: string;
  children: ReactNode;
}

/* Shared shell for the standalone paper pages (/privacy, /terms, /delete).
   DESIGN_FROZEN.md: paper ground, black type, Geist Sans only, no display font,
   no cosmic imagery. These pages render outside the App shell, so they carry
   their own ground rather than sitting on the night backdrop. */
export default function PaperPage({ title, standfirst, children }: Props) {
  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#FBFAF7',
        color: '#1A1A1A',
        fontFamily: 'var(--sv-font)',
        padding: '32px 20px 64px',
      }}
    >
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <a
          href="/"
          style={{
            fontSize: 13, letterSpacing: '0.22em', fontWeight: 700,
            color: '#1A1A1A', textDecoration: 'none',
          }}
        >
          SOVRN
        </a>

        <div style={{ height: 1, background: '#E8E6E1', margin: '14px 0 32px' }} />

        <h1 style={{ fontFamily: 'var(--sv-font)', fontSize: 28, fontWeight: 500, lineHeight: 1.25, color: '#000000' }}>
          {title}
        </h1>

        {standfirst && (
          <p style={{ marginTop: 10, fontSize: 14, color: '#6E6A66', lineHeight: 1.6 }}>
            {standfirst}
          </p>
        )}

        <div style={{ marginTop: 28 }}>{children}</div>

        <div style={{ height: 1, background: '#E8E6E1', margin: '40px 0 16px' }} />
        <p style={{ fontSize: 13, color: '#6E6A66' }}>
          <a href="/privacy" style={{ color: '#1A1A1A' }}>Privacy</a>
          <span style={{ padding: '0 8px' }}>·</span>
          <a href="/terms" style={{ color: '#1A1A1A' }}>Terms</a>
          <span style={{ padding: '0 8px' }}>·</span>
          <a href="/delete" style={{ color: '#1A1A1A' }}>Delete my data</a>
        </p>
      </div>
    </div>
  );
}

/* Section heading and body, so the three pages stay typographically identical. */
export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ fontFamily: 'var(--sv-font)', fontSize: 15, fontWeight: 700, color: '#000000', marginTop: 28, letterSpacing: '0.02em' }}>
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.7, color: '#1A1A1A' }}>
      {children}
    </p>
  );
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ marginTop: 10, paddingLeft: 18, listStyle: 'disc' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 15, lineHeight: 1.7, color: '#1A1A1A', marginTop: 4 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
