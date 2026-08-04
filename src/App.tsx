import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ApiKeyModal from './components/ApiKeyModal';
import HeroPage from './pages/HeroPage';
import QuizPage from './pages/QuizPage';
import LoadingPage from './pages/LoadingPage';
import BlueprintPage from './pages/BlueprintPage';
import type { AppPage, QuizData } from './types';
import { generateBlueprint } from './utils/api';
import { saveBlueprint, getBlueprint, getQuizData, trackEvent } from './utils/storage';

const API_KEY_STORAGE = 'sovrn_api_key';

export default function App() {
  const [page, setPage] = useState<AppPage>('hero');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamDone, setStreamDone] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuizData, setPendingQuizData] = useState<QuizData | null>(null);

  useEffect(() => {
    trackEvent('pageView', 'hero');
    const existing = getBlueprint();
    const existingQuiz = getQuizData();
    if (existing && existingQuiz) {
      setStreamingText(existing.text);
      setStreamDone(true);
      setQuizData(existingQuiz);
    }

    // DEV-only: preview a screen in isolation via ?screen=loading|quiz.
    // Gated by import.meta.env.DEV — stripped from production builds.
    if (import.meta.env.DEV) {
      const s = new URLSearchParams(window.location.search).get('screen');
      if (s === 'loading' || s === 'quiz') setPage(s);
    }
  }, []);

  const handleGenerate = useCallback((data: QuizData, apiKey?: string) => {
    setPage('loading');
    setError(null);
    setStreamingText('');
    setStreamDone(false);
    setQuizData(data);
    trackEvent('quizComplete');

    generateBlueprint(
      data,
      {
        onFirstChunk: () => {
          setPage('blueprint');
        },
        onChunk: (text) => {
          setStreamingText((prev) => prev + text);
        },
        onDone: (fullText) => {
          saveBlueprint({ text: fullText });
          setStreamDone(true);
        },
        onError: (err) => {
          console.error('Blueprint generation failed:', err);
          const message = err.message;

          if (!apiKey && (message.includes('404') || message.includes('Failed to fetch'))) {
            setPage('quiz');
            setPendingQuizData(data);
            setShowApiKeyModal(true);
            return;
          }

          setError(message);
          setPage('quiz');
        },
      },
      apiKey
    );
  }, []);

  const handleQuizComplete = (data: QuizData) => {
    const localKey = localStorage.getItem(API_KEY_STORAGE);
    handleGenerate(data, localKey || undefined);
  };

  const handleApiKeySubmit = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
    setShowApiKeyModal(false);
    if (pendingQuizData) {
      handleGenerate(pendingQuizData, key);
      setPendingQuizData(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0E1A', position: 'relative' }}>
      {/* Night-sky backdrop (fixed, behind everything) */}
      <div className="sv-backdrop" aria-hidden="true" />

      {/* Error banner */}
      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-6 py-3 max-w-md text-center"
          style={{ background: 'rgba(217,58,43,0.12)', border: '1px solid rgba(217,58,43,0.3)', backdropFilter: 'blur(12px)' }}
        >
          <p className="text-sm" style={{ color: '#F4F1EA', fontFamily: 'Georgia, serif' }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs mt-1"
            style={{ color: 'rgba(244,241,234,0.6)', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* API Key Modal (local dev fallback) */}
      <AnimatePresence>
        {showApiKeyModal && (
          <ApiKeyModal
            onSubmit={handleApiKeySubmit}
            onClose={() => setShowApiKeyModal(false)}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 1 }}>
      <AnimatePresence mode="wait">
        {page === 'hero' && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroPage
              onStart={() => {
                trackEvent('pageView', 'quiz');
                window.scrollTo(0, 0);
                setPage('quiz');
              }}
            />
          </motion.div>
        )}

        {page === 'quiz' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <QuizPage
              onComplete={handleQuizComplete}
              onBack={() => setPage('hero')}
            />
          </motion.div>
        )}

        {page === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LoadingPage />
          </motion.div>
        )}

        {page === 'blueprint' && quizData && (
          <motion.div
            key="blueprint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <BlueprintPage
              text={streamingText}
              isDone={streamDone}
              quizData={quizData}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {page === 'hero' && streamDone && streamingText && quizData && (
        <button
          onClick={() => setPage('blueprint')}
          className="fixed bottom-6 right-6 z-20 text-xs tracking-widest uppercase px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'rgba(15,18,35,0.7)',
            color: '#E8B04B',
            border: '1px solid rgba(232,176,75,0.25)',
            backdropFilter: 'blur(12px)',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '0.1em',
          }}
        >
          View Your Blueprint
        </button>
      )}
    </div>
  );
}
