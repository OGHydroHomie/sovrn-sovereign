import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { trackEvent } from '../utils/storage';

interface Props {
  onStart: () => void;
}

const FEATURE_CARDS = [
  {
    title: 'THE ARCHITECTURE YOU WERE BORN WITH',
    body: 'Your Sun, Rising, and North Node decoded as archetypes of power — the hidden structure of who you were built to become.',
    accent: '#DC2626',
  },
  {
    title: "THE PATTERN THAT'S BEEN RUNNING YOUR LIFE",
    body: 'The precise mechanism behind the loop you keep repeating — named with surgical accuracy, so it can finally be seen and broken.',
    accent: '#1A1A1A',
  },
  {
    title: 'WHERE YOUR LIFE IS ACTUALLY TRYING TO GO',
    body: 'The trajectory your chart is pulling you toward, and the first sovereign act that moves you inside your real life.',
    accent: '#DC2626',
  },
];

export default function HeroPage({ onStart }: Props) {
  const handleStart = () => {
    trackEvent('quizStart');
    onStart();
  };

  const scrollDown = () => {
    document.getElementById('hero-more')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* SCREEN 1 — Landing: full viewport, centered, no scroll required */}
      <section className="app-screen relative flex flex-col items-center justify-center text-center px-6 py-10">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="sovrn-wordmark absolute top-10 left-1/2 -translate-x-1/2"
        >
          SOVRN
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            color: '#DC2626',
            fontWeight: 700,
            fontSize: '36px',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}
        >
          Remember who you are.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          style={{
            color: '#4A4A4A',
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: 1.6,
            maxWidth: '340px',
            marginTop: '20px',
          }}
        >
          You've read the books. Done the work. Built the habits. And something
          still feels like it's missing — like you're living adjacent to your
          actual life rather than inside it. That's not a discipline problem.
          That's a blueprint problem.
        </motion.p>

        <div style={{ height: '32px' }} />

        <motion.button
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          onClick={handleStart}
          className="app-button breathe"
        >
          Begin Your Blueprint
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          style={{ color: '#9A9A9A', fontSize: '13px', fontWeight: 400, marginTop: '16px' }}
        >
          Free · 5 minutes · No account required
        </motion.p>

        <button
          onClick={scrollDown}
          aria-label="See more"
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: '28px', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
        >
          <ChevronDown className="chevron-bounce" size={24} color="#9A9A9A" />
        </button>
      </section>

      {/* SCREEN 1 (optional scroll) — feature cards + second CTA */}
      <section
        id="hero-more"
        className="relative flex flex-col items-center justify-center px-6 py-20"
      >
        <div className="w-full" style={{ maxWidth: '380px' }}>
          <p
            className="text-center"
            style={{
              color: '#9A9A9A',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            What your blueprint reveals
          </p>

          <div className="flex flex-col gap-4">
            {FEATURE_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="app-card"
                style={{
                  padding: '22px',
                  borderLeft: `3px solid ${card.accent}`,
                  background: '#FFFFFF',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                }}
              >
                <h3
                  style={{
                    color: '#1A1A1A',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    lineHeight: 1.35,
                    marginBottom: '10px',
                  }}
                >
                  {card.title}
                </h3>
                <p style={{ color: '#4A4A4A', fontSize: '15px', lineHeight: 1.55 }}>
                  {card.body}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
            className="text-center"
            style={{
              color: '#DC2626',
              fontSize: '18px',
              fontWeight: 600,
              fontStyle: 'italic',
              lineHeight: 1.5,
              margin: '40px auto 32px',
              maxWidth: '320px',
            }}
          >
            Seven questions. One blueprint. No two are the same.
          </motion.p>

          <button onClick={handleStart} className="app-button breathe">
            Begin Your Blueprint
          </button>

          <p
            className="text-center"
            style={{ color: '#9A9A9A', fontSize: '13px', marginTop: '16px' }}
          >
            Free · 5 minutes · No account required
          </p>
        </div>
      </section>
    </div>
  );
}
