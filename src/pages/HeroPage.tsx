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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cosmic-purple/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h2 className="text-sm md:text-base tracking-[0.4em] uppercase gold-glow font-medium">
            SOVRN
          </h2>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6"
        >
          <span className="text-gradient">Remember</span>
          <br />
          <span className="text-gradient">who you are.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mb-14 leading-relaxed"
          style={{ color: 'rgba(245, 240, 232, 0.6)' }}
        >
          Enter your birth data. Receive your Sovereign Blueprint — a personalized
          decode of your soul architecture, shadow pattern, and true north written
          into your natal chart before you were born.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <button onClick={handleStart} className="sovereign-button text-lg">
            Begin Your Blueprint
          </button>
        </motion.div>
      </div>
    </div>
  );
}
