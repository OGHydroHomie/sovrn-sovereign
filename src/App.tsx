import { useState, useEffect, useCallback, useRef } from 'react';
import Fade from './components/Fade';
import HeroPage from './pages/HeroPage';
import ThresholdPage from './pages/ThresholdPage';
import QuizPage from './pages/QuizPage';
import LoadingPage from './pages/LoadingPage';
import BlueprintPage from './pages/BlueprintPage';
import { markFrameUrls, preloadFrames } from './lib/marks';
import { prefersReducedMotion } from './lib/motion';
import type { AppPage, QuizData } from './types';
import { generateBlueprint } from './utils/api';
import { saveBlueprint, getBlueprint, getQuizData, trackEvent } from './utils/storage';
import { ensureUser } from './lib/session';
import { createDayOneEntry, getEntryForDay, type LedgerEntry } from './lib/ledger';
import { parseBlueprint, saveBlueprintRecord } from './lib/blueprint';
import { getOpenCycle, type Cycle } from './lib/cycle';

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
  /* Set the moment the reading arrives, while the loading screen is still up.
     The square resolves into this name, and only then does the reading open —
     so the name is revealed once, in one continuous movement, rather than
     appearing on one screen and again on the next. */
  const [archetype, setArchetype] = useState<string | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  /* True for one showing only: the first reveal, with all six frames decoded.
     A returning visitor and the saved view open on the finished mark — a
     picture comes into focus once, and replaying it on every visit would turn
     the one moment the product spends on ceremony into a transition. */
  const [crystallize, setCrystallize] = useState(false);
  const blueprintRef = useRef('');
  /* Mirrors quizData for callbacks that must not re-create on every answer. */
  const quizRef = useRef<QuizData | null>(null);

  /* On reveal, keep the parsed reading — including the act not taken — on the
     users row, and recover an existing Day 1 entry for a returning visitor. The
     ledger entry itself is written when the person chooses an act, not before:
     the choice is the commitment. */
  const refreshCycle = useCallback(async () => { setCycle(await getOpenCycle()); }, []);

  const openBlueprint = useCallback(async (blueprintText: string, desiredReality?: string) => {
    const parsed = parseBlueprint(blueprintText);
    const [existing] = await Promise.all([getEntryForDay(1), refreshCycle()]);
    if (existing) setDayOne(existing);
    void saveBlueprintRecord({ parsed, chosen: null, desiredReality, blueprintText });
  }, [refreshCycle]);

  const handleChooseAct = useCallback(
    async (chosen: 'hard' | 'next', missionText: string) => {
      if (!missionText.trim()) return;
      const entry = await createDayOneEntry(missionText.trim(), cycle?.id);
      if (entry) setDayOne(entry);
      void saveBlueprintRecord({
        parsed: parseBlueprint(blueprintRef.current),
        chosen,
        desiredReality: quizRef.current?.desiredReality,
        blueprintText: blueprintRef.current,
      });
    },
    [cycle]
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
      quizRef.current = existingQuiz;
      void openBlueprint(existing.text, existingQuiz.desiredReality);
    }

    // DEV-only: preview a screen in isolation via ?screen=loading|quiz|blueprint.
    // Gated by import.meta.env.DEV — stripped from production builds.
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('screen');
      if (s === 'loading' || s === 'quiz') {
        setPage(s);
        /* ?screen=loading&land=2000 lands a mock reading after two seconds and
           then leaves the app alone. Everything after that is the real path —
           the square settles, LoadingPage preloads the frames, handleRevealed
           fires with what it found, the reveal opens and crystallizes. It is
           the only way to look at the hand-over between the two screens without
           spending twenty seconds and a generation on it. */
        const land = Number(params.get('land'));
        if (s === 'loading' && Number.isFinite(land) && land > 0) {
          setQuizData({
            name: 'Elijah', birthDate: '1990-04-05', birthTime: '08:30',
            birthTimeUnknown: false, birthPlace: 'Detroit, USA',
            deepestFear: '', desiredReality: '', repeatingPattern: '', email: '',
          });
          setTimeout(() => {
            setBlueprint(DEV_MOCK_BLUEPRINT);
            blueprintRef.current = DEV_MOCK_BLUEPRINT;
            setArchetype(parseBlueprint(DEV_MOCK_BLUEPRINT).becoming || 'YOUR BLUEPRINT');
          }, land);
        }
      } else if (s === 'blueprint') {
        setQuizData({
          name: 'Elijah', birthDate: '1990-04-05', birthTime: '08:30',
          birthTimeUnknown: false, birthPlace: 'Detroit, USA',
          deepestFear: '', desiredReality: '', repeatingPattern: '', email: '',
        });
        setBlueprint(DEV_MOCK_BLUEPRINT);
        blueprintRef.current = DEV_MOCK_BLUEPRINT;
        /* ?screen=blueprint&crystallize=1 previews the reveal sequence. It goes
           through the same preload and the same flag the real path uses — the
           only thing skipped is the twenty seconds of generation in front of
           it — so what runs here is what runs after a real reading lands. */
        if (params.get('crystallize') === '1') {
          /* Mirrors LoadingPage exactly, including not fetching the five earlier
             frames when the person has asked for less motion — a preview that
             loads what the real path would not is a preview of something else. */
          const urls = prefersReducedMotion() ? null : markFrameUrls(parseBlueprint(DEV_MOCK_BLUEPRINT).becoming);
          void (urls ? preloadFrames(urls) : Promise.resolve(false)).then((ok) => {
            setCrystallize(ok);
            setPage('blueprint');
          });
        } else {
          setPage('blueprint');
        }
      }
    }
  }, []);

  const handleGenerate = useCallback((data: QuizData) => {
    setPage('loading');
    setError(null);
    setBlueprint('');
    setArchetype(null);
    setQuizData(data);
    quizRef.current = data;
    trackEvent('quizComplete');

    generateBlueprint(data, {
      // The reading arrives whole. The loading screen holds until it does, then
      // the reveal runs — nothing is rendered half-written.
      onDone: (fullText) => {
        saveBlueprint({ text: fullText });
        setBlueprint(fullText);
        blueprintRef.current = fullText;
        // Stay on the loading screen. Naming the archetype starts the dissolve;
        // LoadingPage calls back when the name has landed and the page turns
        // then. The fallback matches the reveal's so the two never disagree.
        setArchetype(parseBlueprint(fullText).becoming || 'YOUR BLUEPRINT');
        void openBlueprint(fullText, data.desiredReality);
      },
      // Stay on the loading screen. Sending someone who just typed their
      // deepest fear back to "what's your first name" loses eight answers to a
      // transient server error. quizData is still in state and in localStorage,
      // so retry reuses it exactly.
      onError: (err) => {
        console.error('Blueprint generation failed:', err);
        setError(err.message);
      },
    });
  }, [openBlueprint]);

  const handleQuizComplete = (data: QuizData) => handleGenerate(data);

  /* Stable identity: LoadingPage holds this in a timer, and a new function on
     every render would restart the hold and never fire. */
  const handleRevealed = useCallback((framesReady: boolean) => {
    /* The sequence starts at the top of the page or it starts off-screen. Every
       other transition in this file already does this; the reveal did not, and
       an autofocus inside it was quietly scrolling the card out of view. */
    window.scrollTo(0, 0);
    setCrystallize(framesReady);
    setPage('blueprint');
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBFAF7', position: 'relative' }}>



      <div style={{ position: 'relative', zIndex: 1 }}>
        {page === 'hero' && (
          <Fade key="hero" duration={0.5}>
            <HeroPage
              onStart={() => {
                trackEvent('pageView', 'threshold');
                window.scrollTo(0, 0);
                setPage('threshold');
              }}
            />
          </Fade>
        )}

        {/* No Fade. The door does not animate — it is the one screen that is not
            moving anyone anywhere. */}
        {page === 'threshold' && (
          <ThresholdPage
            onEnter={() => {
              trackEvent('pageView', 'quiz');
              window.scrollTo(0, 0);
              setPage('quiz');
            }}
            onLeave={() => {
              window.scrollTo(0, 0);
              setPage('hero');
            }}
          />
        )}

        {page === 'quiz' && (
          <Fade key="quiz" duration={0.5}>
            <QuizPage
              onComplete={handleQuizComplete}
              onBack={() => setPage('hero')}
            />
          </Fade>
        )}

        {page === 'loading' && (
          <Fade key="loading" duration={0.3}>
            <LoadingPage
              error={error}
              archetype={archetype}
              onRevealed={handleRevealed}
              onRetry={() => quizData && handleGenerate(quizData)}
            />
          </Fade>
        )}

        {/* The reveal is the one page that does not fade in. Frame one of the
            crystallization has to be on screen in the first paint, at full
            opacity, continuing the black square the loading screen just
            finished filling — a 300ms cross-fade over the top of that is the
            seam the sequence exists to avoid. Every other route here still
            fades, because for them this is a page change like any other. */}
        {page === 'blueprint' && quizData && (
          crystallize ? (
            <BlueprintPage
              key="blueprint"
              text={blueprint}
              quizData={quizData}
              dayOne={dayOne}
              onChooseAct={handleChooseAct}
              hasCycle={Boolean(cycle)}
              onCycleOpened={refreshCycle}
              crystallize
            />
          ) : (
            <Fade key="blueprint" duration={0.3}>
              <BlueprintPage
                text={blueprint}
                quizData={quizData}
                dayOne={dayOne}
                onChooseAct={handleChooseAct}
                hasCycle={Boolean(cycle)}
                onCycleOpened={refreshCycle}
              />
            </Fade>
          )
        )}
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
