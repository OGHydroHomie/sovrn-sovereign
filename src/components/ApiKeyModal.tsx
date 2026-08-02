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
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(26,26,26,0.35)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="app-card w-full"
        style={{ maxWidth: 400, padding: 28, background: '#FFFFFF' }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-2">
            <Key size={18} color="#DC2626" />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Claude API Key</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#9A9A9A" />
          </button>
        </div>
        <p style={{ fontSize: 14, color: '#4A4A4A', marginBottom: 16, lineHeight: 1.5 }}>
          Enter your Anthropic API key to generate your blueprint. Your key is
          stored locally and never sent to our servers.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          className="app-field"
          style={{ marginBottom: 20 }}
        />
        <button
          onClick={() => key.trim() && onSubmit(key.trim())}
          disabled={!key.trim()}
          className="app-button"
        >
          Save &amp; Generate
        </button>
      </motion.div>
    </motion.div>
  );
}
