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
import { ensureUser } from './lib/session';
import { extractSovereignAct, requestMission } from './lib/mission';
import { createDayOneEntry, getEntryForDay, type LedgerEntry } from './lib/ledger';

const API_KEY_STORAGE = 'sovrn_api_key';

/* DEV-only sample text for previewing the Blueprint screen (?screen=blueprint).
   Never referenced in production paths — only inside an import.meta.env.DEV guard. */
const DEV_MOCK_BLUEPRINT = `SOUL ARCHITECTURE

Your Sun sits at 14.7° Aries — the raw ignition point of the zodiac, the placement of the one who arrives before the map exists. You were not built to follow a trail. You were built to be the reason a trail exists at all.

Your Rising in Scorpio wraps that fire in a still, watchful surface. People feel the heat before they see the flame. This is the architecture of someone whose presence is felt in a room a full second before they speak.

"You have spent years apologizing for the exact intensity you were born to wield."

SHADOW PATTERN

Your South Node in Libra keeps handing you the same bargain: keep the peace, and you get to keep the room. So you shrink the flame to fit other people's comfort, then resent them for a smallness you chose.

"You don't have a discipline problem. You have a permission problem."

TRUE NORTH

Your North Node in Aries is not asking you to be liked. It is asking you to be first — to move before consensus, to let the disagreement happen and survive it. Your Jupiter in the tenth says the visibility you fear is the exact soil your growth needs.

FIRST SOVEREIGN ACT

Within the next 24 hours: say the unpopular thing you have been softening. One sentence, unhedged, to the person whose approval you have been managing.

"I am done being palatable. I am here to be true."`;

export default function App() {
  const [page, setPage] = useState<AppPage>('hero');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamDone, setStreamDone] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuizData, setPendingQuizData] = useState<QuizData | null>(null);
  const [dayOne, setDayOne] = useState<LedgerEntry | null>(null);

  /* Derive the Day 1 mission from the blueprint's First Sovereign Act and write it
     to the ledger at generation time. The row exists as soon as the mission is
     shown, so a day that goes uncompleted stays visible as an open entry. */
  const startDayOne = useCallback(async (blueprintText: string) => {
    const act = extractSovereignAct(blueprintText);
    if (!act) return;

    const existing = await getEntryForDay(1);
    if (existing) {
      setDayOne(existing);
      return;
    }

    const mission = await requestMission(act);
    if (!mission) return;

    setDayOne(await createDayOneEntry(mission.mission));
  }, []);

  useEffect(() => {
    trackEvent('pageView', 'hero');

    // First visit: anonymous sign-in, then the `users` row keyed to auth.uid().
    // Fire-and-forget — nothing on screen waits for it.
    void ensureUser();

    const existing = getBlueprint();
    const existingQuiz = getQuizData();
    if (existing && existingQuiz) {
      setStreamingText(existing.text);
      setStreamDone(true);
      setQuizData(existingQuiz);
      // Returning visitor: recover the ledger row written on the first pass, or
      // derive it now if the blueprint predates the mission.
      void startDayOne(existing.text);
    }

    // DEV-only: preview a screen in isolation via ?screen=loading|quiz|blueprint.
    // Gated by import.meta.env.DEV — stripped from production builds.
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('screen');
      if (s === 'loading' || s === 'quiz') {
        setPage(s);
      } else if (s === 'blueprint') {
        setQuizData({
          name: 'Elijah', birthDate: '1990-04-05', birthTime: '08:30',
          birthTimeUnknown: false, birthPlace: 'Detroit, USA',
          deepestFear: '', desiredReality: '', repeatingPattern: '', email: '',
        });
        setStreamingText(DEV_MOCK_BLUEPRINT);
        setStreamDone(params.get('streaming') !== '1');
        setPage('blueprint');
      }
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
          void startDayOne(fullText);
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
  }, [startDayOne]);

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
          style={{ background: 'rgba(244,241,234,0.12)', border: '1px solid rgba(244,241,234,0.3)', backdropFilter: 'blur(12px)' }}
        >
          <p className="text-sm" style={{ color: '#F4F1EA', fontFamily: 'var(--sv-font)' }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs mt-1"
            style={{ color: 'rgba(244,241,234,0.6)', fontFamily: 'var(--sv-font)' }}
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
              dayOne={dayOne}
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
            color: '#F4F1EA',
            border: '1px solid rgba(244,241,234,0.25)',
            backdropFilter: 'blur(12px)',
            fontFamily: 'var(--sv-font)',
            letterSpacing: '0.1em',
          }}
        >
          View Your Blueprint
        </button>
      )}
    </div>
  );
}
