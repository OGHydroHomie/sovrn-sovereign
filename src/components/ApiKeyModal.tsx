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
        className="p-8 max-w-md w-full"
        style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5" style={{ color: '#DC2626' }} />
            <h3 className="text-lg font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A1A' }}>Claude API Key</h3>
          </div>
          <button onClick={onClose} style={{ color: '#9A9A9A' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm mb-4" style={{ fontFamily: 'Georgia, serif', color: '#4A4A4A' }}>
          Enter your Anthropic API key to generate your personalized blueprint.
          Your key is stored locally and never sent to our servers.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          className="field-input mb-4"
        />
        <button
          onClick={() => key.trim() && onSubmit(key.trim())}
          disabled={!key.trim()}
          className="btn-sovereign w-full"
        >
          Save & Generate Blueprint
        </button>
      </motion.div>
    </motion.div>
  );
}
