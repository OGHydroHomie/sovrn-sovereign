import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const MESSAGES = [
  'Reading your natal architecture...',
  'Mapping your shadow pattern...',
  'Calculating your true north...',
  'Generating your sovereign blueprint...',
];

export default function LoadingPage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-screen flex flex-col items-center justify-center px-6 text-center">
      <div style={{ minHeight: 28, marginBottom: 32 }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ color: '#4A4A4A', fontSize: 16, fontWeight: 400 }}
          >
            {MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2" aria-hidden="true">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
    </div>
  );
}
