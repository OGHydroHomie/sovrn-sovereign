import { motion } from 'framer-motion';
import { trackEvent } from '../utils/storage';

interface Props {
  onStart: () => void;
}

export default function HeroPage({ onStart }: Props) {
  const handleStart = () => {
    trackEvent('quizStart');
    onStart();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-20">
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-12"
        >
          <p className="text-sm tracking-[0.4em] uppercase gold-glow font-medium"
             style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            SOVRN
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-8 gold-glow-strong"
        >
          Remember who you are.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mb-16 leading-relaxed"
          style={{ color: 'rgba(245, 240, 232, 0.6)', fontFamily: "'Cormorant Garamond', serif" }}
        >
          Enter your birth data. Receive your Sovereign Blueprint — a personalized
          decode of your soul architecture, shadow pattern, and true north written
          into your natal chart before you were born.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <button onClick={handleStart} className="sovereign-button">
            Begin
          </button>
        </motion.div>
      </div>
    </div>
  );
}
