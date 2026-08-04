import { useEffect } from 'react';
import { trackEvent } from '../utils/storage';

interface Props {
  onStart: () => void;
}

/* Three things the blueprint reveals — stacked, max two sentences each. */
const REVEALS = [
  {
    accent: '#D93A2B',
    title: 'The architecture you were born with',
    body: 'Your Sun, Rising, and North Node decoded as a map of who you were built to become — before anyone had a chance to talk you out of it.',
  },
  {
    accent: '#E8B04B',
    title: "The pattern that's been running your life",
    body: "Your blueprint names the exact loop with enough precision that you'll recognize it immediately — and enough clarity that it loses its grip.",
  },
  {
    accent: '#D93A2B',
    title: 'Where your life is actually trying to go',
    body: 'The direction your entire chart has been pulling you toward since the moment you arrived. Not a suggestion. A coordinate.',
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
      stroke="#6E6A66"
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
    <div style={{ color: '#A8A29B' }}>
      {/* ============================================================= *
       *  ABOVE THE FOLD — one promise, one decision. Spacious.
       * ============================================================= */}
      <section
        style={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 20px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 340, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Wordmark */}
          <div className="sv-eyebrow" style={{ fontSize: 13, letterSpacing: '0.28em' }}>
            SOVRN
          </div>

          {/* 60px → headline */}
          <h1
            className="sv-display"
            style={{
              marginTop: 60,
              fontWeight: 800,
              fontSize: 'clamp(38px, 12vw, 48px)',
              lineHeight: 1.08,
              color: '#F4F1EA',
              letterSpacing: '-0.01em',
            }}
          >
            Remember who <span style={{ color: '#D93A2B' }}>you are.</span>
          </h1>

          {/* 24px → body */}
          <p
            className="sv-display"
            style={{ marginTop: 24, fontWeight: 400, fontSize: 16, lineHeight: 1.6, color: '#A8A29B' }}
          >
            Something still feels off — like you're living adjacent to your actual
            life. Enter your birth data. Find out why.
          </p>

          {/* 40px → button */}
          <button className="sv-btn" style={{ marginTop: 40 }} onClick={handleStart}>
            Begin Your Blueprint
          </button>

          {/* 20px → meta */}
          <p
            style={{
              marginTop: 20,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 400,
              fontSize: 13,
              color: '#6E6A66',
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
            color: '#D93A2B',
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
              style={{ borderLeft: `3px solid ${card.accent}`, textAlign: 'left' }}
            >
              <h3
                className="sv-label"
                style={{ fontSize: 13, color: '#F4F1EA', fontWeight: 700, lineHeight: 1.3 }}
              >
                {card.title}
              </h3>
              <p
                className="sv-serif"
                style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: '#A8A29B' }}
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
            color: '#F4F1EA',
            textAlign: 'center',
            maxWidth: 480,
            margin: '48px auto 0',
          }}
        >
          Seven questions. One blueprint. No two are the same.
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
            color: '#6E6A66',
            textAlign: 'center',
          }}
        >
          SOVRN — 2026
        </p>
      </section>
    </div>
  );
}
