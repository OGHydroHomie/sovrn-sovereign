import { trackEvent } from '../utils/storage';

interface Props {
  onStart: () => void;
}

const REVEAL_CARDS = [
  {
    variant: 'reveal-card--red',
    title: 'Soul Architecture + Hidden Gifts',
    body: 'Your Sun, Rising, and North Node decoded as archetypes of power — the hidden structure of who you were built to become, and the gifts encoded before you arrived.',
  },
  {
    variant: 'reveal-card--black',
    title: 'Shadow Pattern + State of Being',
    body: 'The precise mechanism behind your repeating loops, named with surgical accuracy so it can finally be seen — and the state you keep returning to when the pattern runs.',
  },
  {
    variant: 'reveal-card--red',
    title: 'True North + Career Destiny',
    body: 'The trajectory your chart is pulling you toward. Your Jupiter, North Node, and Midheaven converging into a clear direction — not a destination, a vector.',
  },
];

export default function HeroPage({ onStart }: Props) {
  const handleStart = () => {
    trackEvent('quizStart');
    onStart();
  };

  return (
    <div>
      {/* Header */}
      <header className="site-header">
        <div className="brand-mark">SOVRN</div>
        <div className="brand-rule" />
      </header>

      {/* Hero */}
      <section className="hero">
        <p className="eyebrow-red hero-eyebrow">Sovereign Blueprint</p>

        <h1 className="hero-title">REMEMBER WHO YOU ARE.</h1>

        <p className="hero-sub">
          Your natal chart holds an architecture that was set before you arrived.
          Enter your birth data and receive a personalized decode of your soul
          pattern, your shadow, your hidden gifts, and your true north — in
          language that will not let you look away.
        </p>

        <button className="btn-sovereign" onClick={handleStart}>
          Begin Your Blueprint
        </button>

        <p className="hero-fineprint">Free · 5 minutes · No account required</p>
      </section>

      {/* What your blueprint reveals */}
      <section className="reveals">
        <p className="eyebrow-red reveals-label">What Your Blueprint Reveals</p>

        <div className="reveal-grid">
          {REVEAL_CARDS.map((card) => (
            <div key={card.title} className={`reveal-card ${card.variant}`}>
              <h3 className="reveal-title">{card.title}</h3>
              <p className="reveal-body">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pull quote */}
      <section className="pull-section">
        <p className="pull-quote">
          Seven questions. One blueprint. No two are the same.
        </p>
        <p className="pull-sub">
          Powered by astronomical calculations from your exact birth data
        </p>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <button className="btn-sovereign" onClick={handleStart}>
          Begin Your Blueprint
        </button>
      </section>

      {/* Footer */}
      <footer className="site-footer">SOVRN — 2026</footer>
    </div>
  );
}
