import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import StarField from './components/StarField';
import ApiKeyModal from './components/ApiKeyModal';
import HeroPage from './pages/HeroPage';
import QuizPage from './pages/QuizPage';
import LoadingPage from './pages/LoadingPage';
import BlueprintPage from './pages/BlueprintPage';
import type { AppPage, QuizData, BlueprintResult } from './types';
import { generateBlueprint } from './utils/api';
import { saveBlueprint, getBlueprint, getQuizData, trackEvent } from './utils/storage';

const API_KEY_STORAGE = 'sovrn_api_key';

export default function App() {
  const [page, setPage] = useState<AppPage>('hero');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintResult | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuizData, setPendingQuizData] = useState<QuizData | null>(null);

  useEffect(() => {
    trackEvent('pageView', 'hero');
    const existing = getBlueprint();
    const existingQuiz = getQuizData();
    if (existing && existingQuiz) {
      setBlueprint(existing);
      setQuizData(existingQuiz);
    }
  }, []);

  const handleGenerate = useCallback(async (data: QuizData, apiKey?: string) => {
    setPage('loading');
    setError(null);
    trackEvent('quizComplete');

    try {
      const result = await generateBlueprint(data, apiKey);
      saveBlueprint(result);
      setBlueprint(result);
      setQuizData(data);
      setPage('blueprint');
    } catch (err) {
      console.error('Blueprint generation failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate blueprint.';

      // If proxy failed (no backend), fall back to asking for API key
      if (!apiKey && (message.includes('404') || message.includes('Failed to fetch'))) {
        setPage('quiz');
        setPendingQuizData(data);
        setShowApiKeyModal(true);
        return;
      }

      setError(message);
      setPage('quiz');
    }
  }, []);

  const handleQuizComplete = (data: QuizData) => {
    // Try proxy first (production). If it fails, the error handler will show the API key modal.
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
    <div className="min-h-screen bg-space-black">
      <StarField />

      {/* Error banner */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-3 max-w-md text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400/60 text-xs mt-1 hover:text-red-400"
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

      {page === 'hero' && (
        <HeroPage
          onStart={() => {
            trackEvent('pageView', 'quiz');
            setPage('quiz');
          }}
        />
      )}

      {page === 'quiz' && (
        <QuizPage
          onComplete={handleQuizComplete}
          onBack={() => setPage('hero')}
        />
      )}

      {page === 'loading' && <LoadingPage />}

      {page === 'blueprint' && blueprint && quizData && (
        <BlueprintPage blueprint={blueprint} quizData={quizData} />
      )}

      {page === 'hero' && blueprint && quizData && (
        <button
          onClick={() => setPage('blueprint')}
          className="fixed bottom-6 right-6 z-20 text-sm text-cosmic-purple-light/60 hover:text-cosmic-purple-light transition-colors bg-space-dark/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-cosmic-purple/10"
        >
          View Your Blueprint
        </button>
      )}
    </div>
  );
}
