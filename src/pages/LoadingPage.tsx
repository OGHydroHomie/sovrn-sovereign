import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MESSAGES = [
  'Analyzing your cosmic blueprint...',
  'Calculating your Success Archetype...',
  'Identifying your business blocks...',
  'Mapping your cosmic advantages...',
  'Designing your ideal business model...',
  'Finalizing your personalized blueprint...',
];

export default function LoadingPage() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev < MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 8 + 2;
      });
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="relative z-10 text-center max-w-lg">
        {/* Constellation animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="mb-12"
        >
          <svg
            viewBox="0 0 200 200"
            className="w-48 h-48 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Constellation lines */}
            {[
              [100, 40, 60, 80],
              [60, 80, 80, 130],
              [80, 130, 140, 130],
              [140, 130, 150, 80],
              [150, 80, 100, 40],
              [80, 130, 60, 170],
              [140, 130, 150, 170],
            ].map(([x1, y1, x2, y2], i) => (
              <motion.line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(139, 92, 246, 0.4)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: i * 0.3 }}
              />
            ))}
            {/* Star nodes */}
            {[
              [100, 40],
              [60, 80],
              [150, 80],
              [80, 130],
              [140, 130],
              [60, 170],
              [150, 170],
            ].map(([cx, cy], i) => (
              <motion.circle
                key={i}
                cx={cx}
                cy={cy}
                r="3"
                fill="#f59e0b"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.3 + 0.2 }}
              >
                <animate
                  attributeName="opacity"
                  values="0.5;1;0.5"
                  dur={`${2 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
              </motion.circle>
            ))}
            {/* Center glow */}
            <motion.circle
              cx="100"
              cy="105"
              r="25"
              fill="none"
              stroke="rgba(139, 92, 246, 0.2)"
              strokeWidth="1"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </svg>
        </motion.div>

        {/* Loading message */}
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-lg text-white/80">{MESSAGES[messageIndex]}</p>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(progress, 95)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <p className="text-xs text-white/30 mt-4">
          Crafting your personalized blueprint...
        </p>
      </div>
    </div>
  );
}
