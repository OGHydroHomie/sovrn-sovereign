import { useEffect } from 'react';
import { trackEvent } from '../utils/storage';
import ReturnLink from '../components/ReturnLink';

interface Props {
  onStart: () => void;
}

/* Three things the blueprint reveals — stacked, max two sentences each. */
const REVEALS = [
  {
    accent: '#1A1A1A',
    title: "A name for who you're becoming",
    body: 'Not a personality type and not a compliment. One name, chosen from thirteen, for the person your own answers keep pointing at.',
  },
  {
    accent: '#1A1A1A',
    title: "The loop you're running now",
    body: 'The specific thing you do that keeps it from happening. Named precisely enough to be uncomfortable, and plainly enough to stop today.',
  },
  {
    accent: '#1A1A1A',
    title: 'One thing to do today',
    body: 'Two options, both doable in under twenty minutes. You pick one, do it, and write down what actually happened.',
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
    <div style={{ color: '#6E6A66' }}>
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
            Find out who you're becoming.
          </h1>

          {/* 24px → body */}
          <p
            className="sv-display"
            style={{ marginTop: 24, fontWeight: 400, fontSize: 16, lineHeight: 1.6, color: '#6E6A66' }}
          >
            Something still feels off — like you're living adjacent to your actual
            life. Enter your birth data. Find out why.
          </p>

          {/* What arrives. None of this was stated anywhere above the fold, so the
              page asked for a birth date without saying what it was buying. */}
          <p
            style={{
              marginTop: 18, fontFamily: 'var(--sv-font)', fontWeight: 300,
              fontSize: 15, lineHeight: 1.7, color: '#1A1A1A',
            }}
          >
            You get a written reading of who you are and the pattern you keep
            running, one act to do today, and a new one every morning at 6am
            written from what you actually did.
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
              color: '#6E6A66',
            }}
          >
            Free · 5 minutes · No password
          </p>


          {/* The way back in for someone on a new device. */}
          <div style={{ marginTop: 26 }}>
            <ReturnLink />
          </div>
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
                style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: '#6E6A66' }}
              >
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* A real excerpt, legible. It was blurred to 6px at 0.7 opacity, which
            showed nothing and looked like a failed render — an unreadable teaser
            teases nothing. It is labelled as a sample so it cannot be mistaken
            for the visitor's own. */}
        <div style={{ marginTop: 48 }}>
          <p
            className="sv-label"
            style={{ fontSize: 11, letterSpacing: '0.18em', color: '#6E6A66', textAlign: 'center', marginBottom: 14 }}
          >
            A SAMPLE READING
          </p>
          <div>
            <div
              className="sv-card"
              style={{ borderLeft: '2px solid #1A1A1A', textAlign: 'left', maxWidth: 360, margin: '0 auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="sv-label" style={{ fontSize: 10, color: '#6E6A66', letterSpacing: '0.18em' }}>
                  Who you are
                </span>
              </div>
              <div
                className="sv-display"
                style={{ fontWeight: 300, fontSize: 30, color: '#000000', marginTop: 10, letterSpacing: '0.01em' }}
              >
                THE HEADLINER
              </div>
              <p style={{ marginTop: 8, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 13, color: '#6E6A66' }}>
                Right now you&rsquo;re the Opening Act.
              </p>
              <p className="sv-serif" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7, color: '#1A1A1A' }}>
                You were built to be heard. Not to be approved of, not to be safe —
                to be heard, with your name on it, in a room full of strangers who
                don&rsquo;t owe you anything.
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
              color: '#6E6A66',
              textAlign: 'center',
            }}
          >
            {'This was generated from a birthday and three questions.'}
          </p>
        </div>

        {/* Second CTA — a different angle from the hero button */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <button className="sv-btn" onClick={handleStart}>
            See which one you are
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
