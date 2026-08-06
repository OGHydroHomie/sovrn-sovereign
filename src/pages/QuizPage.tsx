import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizData } from '../types';
import { saveQuizData, saveLead } from '../utils/storage';

interface Props {
  onComplete: (data: QuizData) => void;
  onBack: () => void;
}

const TOTAL = 8;
/* Progress never starts at zero (see docs/product.md).
   Q1..Q8, with the chart reveal sitting at 55% between Q4 (48) and Q5 (64). */
const PROGRESS = [12, 24, 36, 48, 64, 76, 88, 100];
const REVEAL_PROGRESS = 55;

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xdarebvj';

/* ── Sun-sign preview (date-range math only; the real chart lives in chart.ts) ── */
const SIGN_RANGES: { sign: string; from: [number, number]; to: [number, number] }[] = [
  { sign: 'Capricorn', from: [12, 22], to: [1, 19] },
  { sign: 'Aquarius', from: [1, 20], to: [2, 18] },
  { sign: 'Pisces', from: [2, 19], to: [3, 20] },
  { sign: 'Aries', from: [3, 21], to: [4, 19] },
  { sign: 'Taurus', from: [4, 20], to: [5, 20] },
  { sign: 'Gemini', from: [5, 21], to: [6, 20] },
  { sign: 'Cancer', from: [6, 21], to: [7, 22] },
  { sign: 'Leo', from: [7, 23], to: [8, 22] },
  { sign: 'Virgo', from: [8, 23], to: [9, 22] },
  { sign: 'Libra', from: [9, 23], to: [10, 22] },
  { sign: 'Scorpio', from: [10, 23], to: [11, 21] },
  { sign: 'Sagittarius', from: [11, 22], to: [12, 21] },
];

const ARCHETYPES: Record<string, string> = {
  Aries: 'THE PIONEER',
  Taurus: 'THE SOVEREIGN BUILDER',
  Gemini: 'THE ORACLE OF TONGUES',
  Cancer: 'THE GUARDIAN',
  Leo: 'THE SOVEREIGN FLAME',
  Virgo: 'THE ARCHITECT OF ORDER',
  Libra: 'THE EMISSARY',
  Scorpio: 'THE INITIATOR',
  Sagittarius: 'THE TORCH BEARER',
  Capricorn: 'THE ANCIENT AUTHORITY',
  Aquarius: 'THE PATTERN BREAKER',
  Pisces: 'THE MYSTIC CHANNEL',
};

function sunSignFromDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return 'Aries';
  const [, month, day] = parts;
  for (const { sign, from, to } of SIGN_RANGES) {
    if (from[0] === month && day >= from[1]) return sign;
    if (to[0] === month && day <= to[1]) return sign;
  }
  return 'Aries';
}

/* Fire the lead to Formspree — non-blocking, runs alongside chart calc + stream. */
function fireFormspree(data: QuizData): void {
  const payload = {
    name: data.name,
    birthDate: data.birthDate,
    birthTime: data.birthTime,
    birthTimeUnknown: data.birthTimeUnknown,
    birthPlace: data.birthPlace,
    fear: data.deepestFear,
    desiredReality: data.desiredReality,
    repeatingPattern: data.repeatingPattern,
    email: data.email,
  };
  fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => console.warn('Formspree capture failed:', err));
}

export default function QuizPage({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [phase, setPhase] = useState<'quiz' | 'reveal'>('quiz');
  const revealTimer = useRef<number | null>(null);

  const [data, setData] = useState<QuizData>({
    name: '',
    birthDate: '',
    birthTime: '',
    birthTimeUnknown: false,
    birthPlace: '',
    deepestFear: '',
    desiredReality: '',
    repeatingPattern: '',
    email: '',
  });

  const update = (field: keyof QuizData, value: string | boolean) =>
    setData((prev) => ({ ...prev, [field]: value }));

  useEffect(() => () => { if (revealTimer.current) window.clearTimeout(revealTimer.current); }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.name.trim().length > 0;
      case 1: return !!data.birthDate;
      case 2: return !!data.birthTime || data.birthTimeUnknown;
      case 3: return data.birthPlace.trim().length > 0;
      case 4: return data.deepestFear.trim().length >= 10;
      case 5: return data.desiredReality.trim().length >= 10;
      case 6: return data.repeatingPattern.trim().length >= 10;
      case 7: return /\S+@\S+\.\S+/.test(data.email);
      default: return false;
    }
  };

  const goTo = (next: number, dir: number) => {
    setDirection(dir);
    setStep(next);
  };

  const advance = () => {
    if (!canProceed()) return;

    // After Q4 (birthplace) → chart-insight reveal, then Q5
    if (step === 3) {
      window.scrollTo(0, 0);
      setPhase('reveal');
      revealTimer.current = window.setTimeout(() => {
        setPhase('quiz');
        goTo(4, 1);
      }, 4000);
      return;
    }

    if (step < TOTAL - 1) {
      window.scrollTo(0, 0);
      goTo(step + 1, 1);
    } else {
      // Q8 submit — persist, capture lead, fire Formspree, kick off generation
      saveQuizData(data);
      saveLead(data.name, data.email);
      fireFormspree(data);
      onComplete(data);
    }
  };

  const back = () => {
    if (step > 0) {
      window.scrollTo(0, 0);
      goTo(step - 1, -1);
    } else {
      onBack();
    }
  };

  const skipTime = () => {
    update('birthTimeUnknown', true);
    update('birthTime', '');
    window.scrollTo(0, 0);
    goTo(3, 1);
  };

  const onEnterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed()) advance();
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  // Reveal data (used only during the chart-insight reveal phase)
  const revealSign = sunSignFromDate(data.birthDate);
  const revealArchetype = ARCHETYPES[revealSign] ?? 'THE PIONEER';
  const progressValue = phase === 'reveal' ? REVEAL_PROGRESS : PROGRESS[step];

  // ── Question copy ──
  const QUESTIONS = [
    { n: '01', label: "What's your first name?" },
    { n: '02', label: "What's your date of birth?" },
    { n: '03', label: 'What time were you born?', helper: "Check your birth certificate if you're not sure." },
    { n: '04', label: 'Where were you born?', helper: 'City and country is enough.' },
    { n: '05', label: "What's the one fear you've never said out loud?", helper: "Be specific. Not just 'failure' — what would failure actually look like for you? Who would see it? Why does that terrify you? 2-3 sentences." },
    { n: '06', label: "Describe the life you know you're supposed to be living.", helper: "Not goals. Not a vision board. The life that keeps you up at night because you're not living it yet. What does it look like? What does it feel like? Why aren't you there? Be brutally honest." },
    { n: '07', label: "What's the pattern you keep repeating no matter how many times you swear you've broken it?", helper: "Don't name it — describe the cycle. What triggers it? What do you do every time? How does it end? And then what happens next?" },
    { n: '08', label: 'Where should we send your blueprint?', helper: "We'll deliver a copy to your inbox too." },
  ];
  const q = QUESTIONS[step];

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
      {/* Progress bar — persistent across quiz + reveal so it animates 48 → 55 → 64 */}
      <div style={{ paddingTop: 24, maxWidth: 480, width: '100%', margin: '0 auto' }}>
        <div style={{ height: 3, borderRadius: 999, background: '#2A272B', overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: 999, background: '#C21F2C', boxShadow: '0 0 10px rgba(194,31,44,0.5)' }}
            initial={false}
            animate={{ width: `${progressValue}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {phase === 'reveal' ? (
        /* ── Chart-insight reveal — auto-advances after 4s ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: 40 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="sv-label" style={{ fontSize: 12, color: '#9A9A9A', letterSpacing: '0.22em', fontWeight: 500 }}>
              Your chart has been calculated
            </p>
            <div className="sv-display" style={{ marginTop: 16, fontWeight: 800, fontSize: 28, color: '#D93A2B', letterSpacing: '0.02em' }}>
              {revealArchetype}
            </div>
            <p style={{ marginTop: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: '#A8A29B', letterSpacing: '0.06em' }}>
              {revealSign} Sun
            </p>
            <p className="sv-display" style={{ marginTop: 12, fontStyle: 'italic', fontSize: 15, color: '#A8A29B' }}>
              Four questions remain.
            </p>
          </motion.div>
        </div>
      ) : (
      /* ── Question body — one per screen, vertically centered ── */
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'relative', maxWidth: 340, width: '100%', margin: '0 auto', paddingBottom: 40 }}>
          {/* Decorative question number */}
          <div
            className="sv-label"
            aria-hidden="true"
            style={{ position: 'absolute', top: -64, right: 0, fontSize: 48, fontWeight: 700, color: 'rgba(232,176,75,0.14)' }}
          >
            {q.n}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <h2
                className="sv-display"
                style={{ fontWeight: 600, fontSize: 'clamp(22px, 6.4vw, 26px)', lineHeight: 1.25, color: '#F4F1EA' }}
              >
                {q.label}
              </h2>

              <div style={{ marginTop: 24 }}>
                {step === 0 && (
                  <input
                    type="text"
                    autoFocus
                    value={data.name}
                    onChange={(e) => update('name', e.target.value)}
                    onKeyDown={onEnterKey}
                    placeholder="First name"
                    className="sv-field"
                  />
                )}

                {step === 1 && (
                  <input
                    type="date"
                    value={data.birthDate}
                    onChange={(e) => update('birthDate', e.target.value)}
                    onKeyDown={onEnterKey}
                    className="sv-field"
                  />
                )}

                {step === 2 && (
                  <>
                    <input
                      type="time"
                      value={data.birthTime}
                      onChange={(e) => update('birthTime', e.target.value)}
                      onKeyDown={onEnterKey}
                      className="sv-field"
                    />
                    <p className="sv-serif" style={{ marginTop: 10, fontSize: 13, color: '#9A9A9A', lineHeight: 1.5 }}>
                      {q.helper}
                    </p>
                    <button
                      type="button"
                      onClick={skipTime}
                      style={{
                        marginTop: 14,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 13,
                        color: '#E8B04B',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                      }}
                    >
                      I don't know my birth time
                    </button>
                  </>
                )}

                {step === 3 && (
                  <>
                    <input
                      type="text"
                      value={data.birthPlace}
                      onChange={(e) => update('birthPlace', e.target.value)}
                      onKeyDown={onEnterKey}
                      placeholder="Start typing a city..."
                      className="sv-field"
                    />
                    <p className="sv-serif" style={{ marginTop: 10, fontSize: 13, color: '#9A9A9A', lineHeight: 1.5 }}>
                      {q.helper}
                    </p>
                  </>
                )}

                {(step === 4 || step === 5 || step === 6) && (
                  <>
                    <p className="sv-serif" style={{ marginBottom: 12, fontSize: 13, color: '#9A9A9A', lineHeight: 1.5 }}>
                      {q.helper}
                    </p>
                    <textarea
                      autoFocus
                      value={step === 4 ? data.deepestFear : step === 5 ? data.desiredReality : data.repeatingPattern}
                      onChange={(e) =>
                        update(
                          step === 4 ? 'deepestFear' : step === 5 ? 'desiredReality' : 'repeatingPattern',
                          e.target.value
                        )
                      }
                      className="sv-textarea"
                    />
                  </>
                )}

                {step === 7 && (
                  <>
                    <input
                      type="email"
                      inputMode="email"
                      autoFocus
                      value={data.email}
                      onChange={(e) => update('email', e.target.value)}
                      onKeyDown={onEnterKey}
                      placeholder="your@email.com"
                      className="sv-field"
                    />
                    <p className="sv-serif" style={{ marginTop: 10, fontSize: 13, color: '#9A9A9A', lineHeight: 1.5 }}>
                      {q.helper}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <button className="sv-btn" onClick={advance} disabled={!canProceed()}>
              {step === TOTAL - 1 ? 'Generate My Blueprint' : 'Next'}
            </button>
            <button
              type="button"
              onClick={back}
              style={{
                marginTop: 12,
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                color: '#6E6A66',
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
