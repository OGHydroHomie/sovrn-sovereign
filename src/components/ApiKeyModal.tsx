import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, X } from 'lucide-react';

interface Props {
  onSubmit: (key: string) => void;
  onClose: () => void;
}

export default function ApiKeyModal({ onSubmit, onClose }: Props) {
  const [key, setKey] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-8 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-cosmic-gold" />
            <h3 className="text-lg font-semibold">Claude API Key</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-4">
          Enter your Anthropic API key to generate your personalized blueprint.
          Your key is stored locally and never sent to our servers.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          className="cosmic-input mb-4"
        />
        <button
          onClick={() => key.trim() && onSubmit(key.trim())}
          disabled={!key.trim()}
          className="glow-button w-full !text-base disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Save & Generate Blueprint
        </button>
      </motion.div>
    </motion.div>
  );
}
