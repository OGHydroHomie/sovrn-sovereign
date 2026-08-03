import { useEffect } from 'react';
import { trackEvent } from '../utils/storage';

interface Props {
  onStart: () => void;
}

/* Three things the blueprint reveals — stacked vertically on mobile. */
const REVEALS = [
  {
    accent: '#C21F2C',
    title: 'The architecture you were born with',
    body: "Not who you were told to be. Not who you've been performing. Your Sun, Rising, and North Node decoded as a precise map of your actual power — the gifts that were encoded before anyone had a chance to talk you out of them.",
  },
  {
    accent: '#1A1A1A',
    title: "The pattern that's been running your life",
    body: "You know the loop. You've broken it a hundred times and watched it come back. Your blueprint names the exact mechanism — with enough precision that you'll recognize it immediately, and enough clarity that it loses its grip the moment you see it.",
  },
  {
    accent: '#C21F2C',
    title: 'Where your life is actually trying to go',
    body: "Your Jupiter, North Node, and Midheaven aren't suggestions. They're coordinates. This section shows you the direction your entire chart has been pulling you toward since the moment you arrived.",
  },
];

function DownChevron() {
  return (
    <svg
      className="sv-chevron"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9A9A9A"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function HeroPage({ onStart }: Props) {
  const handleStart = () => {
    trackEvent('quizStart');
    onStart();
  };

  useEffect(() => {
    trackEvent('pageView', 'hero');
  }, []);

  return (
    <div style={{ backgroundColor: '#FBFAF7', color: '#4A4A4A' }}>
      {/* ============================================================= *
       *  ABOVE THE FOLD — one promise, one decision
       * ============================================================= */}
      <section
        style={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 20px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        {/* Wordmark */}
        <div
          className="sv-eyebrow"
          style={{ fontSize: 13, position: 'absolute', top: 28, left: 0, right: 0 }}
        >
          SOVRN
        </div>

        <div style={{ maxWidth: 340, margin: '0 auto', width: '100%' }}>
          <h1
            className="sv-display"
            style={{
              fontWeight: 800,
              fontSize: 'clamp(34px, 11vw, 48px)',
              lineHeight: 1.1,
              color: '#C21F2C',
              letterSpacing: '-0.01em',
            }}
          >
            Remember who you are.
          </h1>

          <p
            className="sv-serif"
            style={{ marginTop: 20, fontSize: 16, lineHeight: 1.6, color: '#4A4A4A' }}
          >
            You've read the books. Done the work. Built the habits. And something
            still feels like it's missing — like you're living adjacent to your
            actual life rather than inside it. That's not a discipline problem.
            That's a blueprint problem.
          </p>

          <p
            className="sv-serif"
            style={{ marginTop: 8, fontSize: 16, lineHeight: 1.6, color: '#4A4A4A' }}
          >
            Enter your birth data. Find out exactly what's been running underneath
            everything.
          </p>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
            <button className="sv-btn" onClick={handleStart}>
              Begin Your Blueprint
            </button>
          </div>

          <p
            style={{
              marginTop: 12,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 400,
              fontSize: 13,
              color: '#9A9A9A',
            }}
          >
            Free · 5 minutes · No account required
          </p>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <DownChevron />
        </div>
      </section>

      {/* ============================================================= *
       *  BELOW THE FOLD — what your blueprint reveals
       * ============================================================= */}
      <section style={{ padding: '8px 20px 64px', maxWidth: 520, margin: '0 auto' }}>
        <p
          className="sv-label"
          style={{
            fontSize: 11,
            color: '#C21F2C',
            letterSpacing: '0.2em',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          What your blueprint reveals
        </p>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {REVEALS.map((card) => (
            <div
              key={card.title}
              className="sv-card"
              style={{ borderLeft: `3px solid ${card.accent}` }}
            >
              <h3
                className="sv-label"
                style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 700, lineHeight: 1.3 }}
              >
                {card.title}
              </h3>
              <p
                className="sv-serif"
                style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: '#4A4A4A' }}
              >
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <p
          className="sv-display"
          style={{
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 22,
            lineHeight: 1.4,
            color: '#4A4A4A',
            textAlign: 'center',
            maxWidth: 480,
            margin: '48px auto 0',
          }}
        >
          Seven questions. One blueprint. No two are the same — because no two
          people arrived with the same architecture.
        </p>

        <p
          style={{
            marginTop: 16,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 400,
            fontSize: 12,
            color: '#9A9A9A',
            textAlign: 'center',
          }}
        >
          Powered by exact astronomical calculations from your birth data.
        </p>

        {/* Second CTA */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <button className="sv-btn" onClick={handleStart}>
            Begin Your Blueprint
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: 40,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 400,
            fontSize: 11,
            letterSpacing: '0.1em',
            color: '#9A9A9A',
            textAlign: 'center',
          }}
        >
          SOVRN — 2026
        </p>
      </section>
    </div>
  );
}
