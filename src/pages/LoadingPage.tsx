import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MESSAGES = [
  'Reading your natal architecture...',
  'Decoding your soul pattern...',
  'Mapping your shadow structure...',
  'Tracing your true north...',
  'Forging your sovereign blueprint...',
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
    }, 4000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 6 + 1;
      });
    }, 600);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="relative z-10 text-center max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="mb-16"
        >
          <svg
            viewBox="0 0 200 200"
            className="w-32 h-32 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
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
                stroke="rgba(212, 175, 55, 0.3)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: i * 0.3 }}
              />
            ))}
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
                r="2"
                fill="#D4AF37"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.3 + 0.2 }}
              >
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur={`${2 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
              </motion.circle>
            ))}
            <motion.circle
              cx="100"
              cy="105"
              r="25"
              fill="none"
              stroke="rgba(212, 175, 55, 0.15)"
              strokeWidth="1"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>

        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <p className="pull-quote" style={{ fontSize: '1.25rem' }}>
            {MESSAGES[messageIndex]}
          </p>
        </motion.div>

        <div className="w-full max-w-xs mx-auto h-px overflow-hidden"
             style={{ background: 'rgba(245, 240, 232, 0.1)' }}>
          <motion.div
            className="h-full"
            style={{ background: '#D4AF37' }}
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(progress, 95)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
