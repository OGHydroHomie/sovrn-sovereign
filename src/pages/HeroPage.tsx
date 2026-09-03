import { useEffect } from 'react';
import { trackEvent } from '../utils/storage';

interface Props {
  onStart: () => void;
}

/* Three things the blueprint reveals — stacked, max two sentences each. */
const REVEALS = [
  {
    accent: '#1A1A1A',
    title: 'The architecture you were born with',
    body: 'Your Sun, Rising, and North Node decoded as a map of who you were built to become — before anyone could talk you out of it.',
  },
  {
    accent: '#1A1A1A',
    title: "The pattern that's been running your life",
    body: "Your blueprint names the exact loop. You'll recognize it immediately — and it loses its grip the moment you see it.",
  },
  {
    accent: '#1A1A1A',
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
    <div style={{ color: '#9A9A9A' }}>
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
          <div className="sv-eyebrow" style={{ fontSize: 13, letterSpacing: '0.28em', color: '#1A1A1A' }}>
            SOVRN
          </div>

          {/* 32px → headline — one line, all bone. The power is in the phrase. */}
          <h1
            className="sv-display"
            style={{
              marginTop: 32,
              fontWeight: 700,
              fontSize: 'clamp(30px, 8.2vw, 48px)',
              lineHeight: 1.1,
              color: '#1A1A1A',
              letterSpacing: '-0.02em',
            }}
          >
            Remember who you are.
          </h1>

          {/* 24px → body */}
          <p
            className="sv-display"
            style={{ marginTop: 24, fontWeight: 400, fontSize: 16, lineHeight: 1.6, color: '#9A9A9A' }}
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
              fontFamily: 'var(--sv-font)',
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
            color: '#1A1A1A',
            letterSpacing: '0.2em',
            fontWeight: 700,
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
              style={{ borderLeft: `2px solid ${card.accent}`, textAlign: 'left' }}
            >
              <h3
                className="sv-label"
                style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 700, lineHeight: 1.3 }}
              >
                {card.title}
              </h3>
              <p
                className="sv-serif"
                style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: '#9A9A9A' }}
              >
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* Blurred blueprint preview — show what's waiting without revealing it */}
        <div style={{ marginTop: 48 }}>
          <div
            aria-hidden="true"
            style={{
              filter: 'blur(6px)',
              opacity: 0.7,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              className="sv-card"
              style={{ borderLeft: '2px solid #1A1A1A', textAlign: 'left', maxWidth: 360, margin: '0 auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="sv-label" style={{ fontSize: 10, color: '#9A9A9A', letterSpacing: '0.18em' }}>
                  Who you are
                </span>
              </div>
              <div className="sv-display" style={{ fontWeight: 700, fontSize: 24, color: '#1A1A1A', marginTop: 10 }}>
                THE PIONEER
              </div>
              <p className="sv-serif" style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: '#9A9A9A' }}>
                Your Aries Sun at 14° burns in the first house — the raw signature
                of someone built to go first, to break the trail the rest will only
                later find the courage to follow.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {['Who you are', 'The pattern', 'One act'].map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: 'var(--sv-font)',
                      fontSize: 11,
                      color: '#1A1A1A',
                      padding: '6px 12px',
                      border: '1px solid #E4E0D6',
                      borderRadius: 999,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p
            style={{
              marginTop: 16,
              fontFamily: 'var(--sv-font)',
              fontWeight: 400,
              fontSize: 14,
              color: '#9A9A9A',
              textAlign: 'center',
            }}
          >
            {'This was generated from a birthday and three questions.'}
          </p>
        </div>

        {/* Second CTA — a different angle from the hero button */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <button className="sv-btn" onClick={handleStart}>
            See what your chart says
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: 40,
            fontFamily: 'var(--sv-font)',
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
