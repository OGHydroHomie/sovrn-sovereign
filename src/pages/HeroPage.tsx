import { motion } from 'framer-motion';
import { Sparkles, Target, Compass } from 'lucide-react';
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
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cosmic-purple/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h2 className="text-sm md:text-base tracking-[0.4em] uppercase text-cosmic-purple-light font-medium">
            SOVRN
          </h2>
          <p className="text-xs tracking-[0.2em] uppercase text-white/40 mt-1">
            Your cosmic blueprint for business sovereignty
          </p>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
        >
          <span className="text-gradient">Discover Your Cosmic</span>
          <br />
          <span className="text-gradient">Business Blueprint</span>
          <span className="text-gradient-gold">™</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Your birth chart reveals why you're stuck at your current revenue
          level—and exactly how to break through.
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mb-14 max-w-3xl mx-auto"
        >
          {[
            {
              icon: Sparkles,
              text: 'Uncover your Success Archetype (Leader, Oracle, Alchemist, Healer, or Teacher)',
            },
            {
              icon: Target,
              text: 'Identify the #1 cosmic block costing you $10K+/month',
            },
            {
              icon: Compass,
              text: 'Get your personalized business model designed for your chart',
            },
          ].map((item, i) => (
            <div key={i} className="glass-card p-6 text-left">
              <item.icon className="w-8 h-8 text-cosmic-gold mb-3" />
              <p className="text-white/80 text-sm leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <button onClick={handleStart} className="glow-button text-lg">
            Take the 3-Minute Diagnostic
          </button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/40 text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cosmic-gold" />
            Used by 500+ spiritual entrepreneurs
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cosmic-purple" />
            94% accuracy rate
          </span>
        </motion.div>
      </div>
    </div>
  );
}
