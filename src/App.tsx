import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import InkField from './components/InkField';
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
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      <InkField />

      {/* Error banner */}
      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-md px-6 py-3 max-w-md text-center"
          style={{ background: '#FFFFFF', border: '1px solid rgba(220,38,38,0.3)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
        >
          <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs mt-1"
            style={{ color: '#9A9A9A' }}
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
            transition={{ duration: 0.8 }}
          >
            <LoadingPage />
          </motion.div>
        )}

        {page === 'blueprint' && quizData && (
          <motion.div
            key="blueprint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <BlueprintPage
              text={streamingText}
              isDone={streamDone}
              quizData={quizData}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {page === 'hero' && streamDone && streamingText && quizData && (
        <button
          onClick={() => setPage('blueprint')}
          className="fixed bottom-6 right-6 z-20 text-xs tracking-widest uppercase px-4 py-2 rounded transition-all"
          style={{
            background: '#FFFFFF',
            color: '#DC2626',
            border: '1px solid #E5E5E5',
            fontFamily: "'Inter', -apple-system, sans-serif",
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          }}
        >
          View Your Blueprint
        </button>
      )}
    </div>
  );
}
