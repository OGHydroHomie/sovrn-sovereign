import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = [
  'Reading your natal architecture...',
  'Mapping your shadow pattern...',
  'Identifying your hidden gifts...',
  'Calculating your true north...',
  'Generating your sovereign blueprint...',
];

/* Same natal constellation as the hero — visual continuity. */
function Constellation() {
  const dots = [
    [18, 52], [46, 32], [72, 60], [96, 26], [124, 48], [150, 22], [60, 14],
  ];
  const lines = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6],
  ];
  return (
    <svg width="160" height="80" viewBox="0 0 160 80" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      {lines.map(([a, b], i) => (
        <line
          key={`l${i}`}
          x1={dots[a][0]} y1={dots[a][1]} x2={dots[b][0]} y2={dots[b][1]}
          stroke="#F4F1EA" strokeOpacity="0.15" strokeWidth="0.5"
        />
      ))}
      {dots.map(([cx, cy], i) => (
        <circle
          key={`d${i}`} className="sv-star" cx={cx} cy={cy} r="1.5" fill="#F4F1EA"
          style={{ animationDelay: `${(i * 0.4).toFixed(1)}s` }}
        />
      ))}
    </svg>
  );
}

export default function LoadingPage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Advance, holding on the final message until the stream takes over
      setIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
        textAlign: 'center',
      }}
    >
      {/* Constellation — continuity with the hero */}
      <div style={{ marginBottom: 44, opacity: 0.9 }}>
        <Constellation />
      </div>

      {/* Rotating oracle messages */}
      <div style={{ minHeight: 28, display: 'flex', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            className="sv-display"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 18, color: '#F4F1EA' }}
          >
            {MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Ember wave dots */}
      <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
        <span className="sv-wave-dot" style={{ animationDelay: '0s' }} />
        <span className="sv-wave-dot" style={{ animationDelay: '0.18s' }} />
        <span className="sv-wave-dot" style={{ animationDelay: '0.36s' }} />
      </div>
    </div>
  );
}
