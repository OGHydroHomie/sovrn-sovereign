import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HeroPage from './pages/HeroPage';
import QuizPage from './pages/QuizPage';
import LoadingPage from './pages/LoadingPage';
import BlueprintPage from './pages/BlueprintPage';
import type { AppPage, QuizData } from './types';
import { generateBlueprint } from './utils/api';
import { saveBlueprint, getBlueprint, getQuizData, trackEvent } from './utils/storage';
import { ensureUser } from './lib/session';
import { createDayOneEntry, getEntryForDay, type LedgerEntry } from './lib/ledger';
import { parseBlueprint, saveBlueprintRecord } from './lib/blueprint';

/* DEV-only sample text for previewing the Blueprint screen (?screen=blueprint).
   Never referenced in production paths — only inside an import.meta.env.DEV guard. */
const DEV_MOCK_BLUEPRINT = `THE HEADLINER
Right now you're the Opening Act.

WHO YOU ARE

You were built to be heard. Not to be approved of, not to be safe — to be heard, with your name on it, in a room full of strangers who don't owe you anything. That is not a fantasy you invented. It is a function you were wired for, the same way a speaker is wired to push air. A speaker sitting in a box is not being modest. It is failing at its one job.

The Headliner doesn't need the room to love them before they walk out. They need to walk out. The work gets made and then it gets released, and the release is part of the work — not a threat to it. You have been treating the door to the stage as the dangerous part. It isn't. The fourteen months in the wings is the dangerous part.

You said you want to tour it in small rooms and not apologise for any of it. That sentence already sounds like someone who has done the thing. It does not sound like someone who needs another pass on the mix.

"You have already written the apology tour. You just haven't given yourself the show first."

THE PATTERN

Here is the mechanism. You finish. The thing is done — you can feel it land, it holds together, it is real. And then a small sound goes off somewhere in the room: what if they find out. Not that you failed, but that you succeeded at something smaller than what they imagined. So you go back in. You call it craft. It is not craft. It is a lock you put on the door from the inside.

The Opening Act will be ready when the fear is gone. The fear is not going to go. It is attached to the work the way a price tag is attached to something valuable. You do not remove the tag by putting the thing back on the shelf. You remove it at the register.

Fourteen months of three-weeks-from-release is not perfectionism. It is a decision, made quietly, every single time, to protect the assumption over the reality. The assumption that you might be as good as they think is more comfortable than a world where strangers have actually heard it and decided. You are choosing the maybe. The maybe is eating the record.

No amount of additional passes changes what the listener will feel. You already know this. That's what makes the loop so efficient — you know, and you go back in anyway.

ONE ACT

THE HARD ONE — Set a release date in public, today, somewhere one other person will see it, before you open the project file again.

THE NEXT ONE — Send the album file to one person you don't know well enough to ask for softness, with a message that says it's done.

Choosing either one costs you the maybe. The maybe is the only thing keeping the fear polite and the record theoretical.

"I am not waiting until I'm sure — I'm releasing it because I made it."`;

export default function App() {
  const [page, setPage] = useState<AppPage>('hero');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [blueprint, setBlueprint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dayOne, setDayOne] = useState<LedgerEntry | null>(null);
  const blueprintRef = useRef('');

  /* On reveal, keep the parsed reading — including the act not taken — on the
     users row, and recover an existing Day 1 entry for a returning visitor. The
     ledger entry itself is written when the person chooses an act, not before:
     the choice is the commitment. */
  const openBlueprint = useCallback(async (blueprintText: string) => {
    const parsed = parseBlueprint(blueprintText);
    const existing = await getEntryForDay(1);
    if (existing) {
      setDayOne(existing);
      void saveBlueprintRecord(parsed, null);
      return;
    }
    void saveBlueprintRecord(parsed, null);
  }, []);

  const handleChooseAct = useCallback(
    async (chosen: 'hard' | 'next', missionText: string) => {
      if (!missionText.trim()) return;
      const entry = await createDayOneEntry(missionText.trim());
      if (entry) setDayOne(entry);
      void saveBlueprintRecord(parseBlueprint(blueprintRef.current), chosen);
    },
    []
  );

  useEffect(() => {
    trackEvent('pageView', 'hero');

    // First visit: anonymous sign-in, then the `users` row keyed to auth.uid().
    // Fire-and-forget — nothing on screen waits for it.
    void ensureUser();

    const existing = getBlueprint();
    const existingQuiz = getQuizData();
    if (existing && existingQuiz) {
      setBlueprint(existing.text);
      blueprintRef.current = existing.text;
      setQuizData(existingQuiz);
      // Returning visitor: recover the ledger row written on the first pass, or
      // derive it now if the blueprint predates the mission.
      void openBlueprint(existing.text);
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
        setBlueprint(DEV_MOCK_BLUEPRINT);
        blueprintRef.current = DEV_MOCK_BLUEPRINT;
        setPage('blueprint');
      }
    }
  }, []);

  const handleGenerate = useCallback((data: QuizData) => {
    setPage('loading');
    setError(null);
    setBlueprint('');
    setQuizData(data);
    trackEvent('quizComplete');

    generateBlueprint(data, {
      // The reading arrives whole. The loading screen holds until it does, then
      // the reveal runs — nothing is rendered half-written.
      onDone: (fullText) => {
        saveBlueprint({ text: fullText });
        setBlueprint(fullText);
        blueprintRef.current = fullText;
        setPage('blueprint');
        void openBlueprint(fullText);
      },
      onError: (err) => {
        console.error('Blueprint generation failed:', err);
        setError(err.message);
        setPage('quiz');
      },
    });
  }, [openBlueprint]);

  const handleQuizComplete = (data: QuizData) => handleGenerate(data);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBFAF7', position: 'relative' }}>

      {/* Error banner */}
      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-6 py-3 max-w-md text-center"
          style={{ background: 'rgba(244,241,234,0.12)', border: '1px solid rgba(244,241,234,0.3)', backdropFilter: 'blur(12px)' }}
        >
          <p className="text-sm" style={{ color: '#1A1A1A', fontFamily: 'var(--sv-font)' }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs mt-1"
            style={{ color: '#6E6A66', fontFamily: 'var(--sv-font)' }}
          >
            Dismiss
          </button>
        </div>
      )}


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
              text={blueprint}
              quizData={quizData}
              dayOne={dayOne}
              onChooseAct={handleChooseAct}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {page === 'hero' && blueprint && quizData && (
        <button
          onClick={() => setPage('blueprint')}
          className="fixed bottom-6 right-6 z-20 text-xs tracking-widest uppercase px-4 py-2 rounded-lg transition-all"
          style={{
            background: '#FBFAF7',
            color: '#1A1A1A',
            border: '1px solid #1A1A1A',
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
