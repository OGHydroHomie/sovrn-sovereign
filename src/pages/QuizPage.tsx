import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizData } from '../types';
import { saveQuizData, saveLead } from '../utils/storage';
import { captureEmail } from '../lib/capture';
import { recordConsent } from '../lib/session';

interface Props {
  onComplete: (data: QuizData) => void;
  onBack: () => void;
}

const TOTAL = 8;
/* Progress never starts at zero (see docs/product.md).
   Q1..Q8, with the chart reveal sitting at 55% between Q4 (48) and Q5 (64). */
const PROGRESS = [12, 24, 36, 48, 64, 76, 88, 100];
const REVEAL_PROGRESS = 55;

/* ── Location autocomplete (OpenStreetMap Nominatim — free, no key) ── */
interface PlaceResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

function formatPlace(item: PlaceResult): string {
  const a = item.address || {};
  const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || '';
  const region = a.state || a.region || a.state_district || '';
  const country = a.country || '';
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(', ') : item.display_name;
}

export default function QuizPage({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [consented, setConsented] = useState(false);
  const [direction, setDirection] = useState(1);
  const [phase, setPhase] = useState<'quiz' | 'reveal'>('quiz');
  const revealTimer = useRef<number | null>(null);

  // Q4 location autocomplete
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placeOpen, setPlaceOpen] = useState(false);
  const placeTimer = useRef<number | null>(null);

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

  useEffect(() => () => {
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
    if (placeTimer.current) window.clearTimeout(placeTimer.current);
  }, []);

  const fetchPlaces = async (query: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'SOVRN-App' } }
      );
      if (!res.ok) return;
      const json = (await res.json()) as PlaceResult[];
      setPlaceResults(json);
      setPlaceOpen(json.length > 0);
    } catch {
      /* network hiccup — manual entry still works, chart.ts geocodes the string */
    }
  };

  const onPlaceChange = (v: string) => {
    // Editing clears any previously resolved coordinates
    setData((prev) => ({ ...prev, birthPlace: v, latitude: undefined, longitude: undefined }));
    if (placeTimer.current) window.clearTimeout(placeTimer.current);
    if (v.trim().length < 3) { setPlaceResults([]); setPlaceOpen(false); return; }
    placeTimer.current = window.setTimeout(() => fetchPlaces(v.trim()), 300);
  };

  const selectPlace = (item: PlaceResult) => {
    setData((prev) => ({
      ...prev,
      birthPlace: formatPlace(item),
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
    setPlaceResults([]);
    setPlaceOpen(false);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.name.trim().length > 0;
      case 1: return !!data.birthDate;
      case 2: return !!data.birthTime || data.birthTimeUnknown;
      case 3: return data.birthPlace.trim().length > 0;
      case 4: return data.deepestFear.trim().length >= 10;
      case 5: return data.desiredReality.trim().length >= 10;
      case 6: return data.repeatingPattern.trim().length >= 10;
      // Q8 is the consent gate: a valid email is not enough on its own.
      case 7: return /\S+@\S+\.\S+/.test(data.email) && consented;
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
      }, 3000);
      return;
    }

    if (step < TOTAL - 1) {
      window.scrollTo(0, 0);
      goTo(step + 1, 1);
    } else {
      // Q8 submit — persist, capture the lead in Supabase, kick off generation.
      // Capture is non-blocking: it runs alongside chart calc + stream.
      saveQuizData(data);
      saveLead(data.name, data.email);
      void recordConsent();
      void captureEmail(data.email, 'quiz');
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
        <div style={{ height: 3, borderRadius: 999, background: '#E4E0D6', overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: 999, background: '#000000' }}
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
            <p className="sv-label" style={{ fontSize: 11, color: '#9A9A9A', letterSpacing: '0.22em', fontWeight: 700 }}>
              That was the easy part
            </p>
            <div
              style={{
                marginTop: 18, fontFamily: 'var(--sv-font)', fontWeight: 300,
                fontSize: 'clamp(22px, 6.4vw, 26px)', lineHeight: 1.3,
                color: '#1A1A1A', maxWidth: 300,
              }}
            >
              The next four are about you.
            </div>
            <p style={{ marginTop: 16, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, lineHeight: 1.6, color: '#6E6A66', maxWidth: 300 }}>
              Answer them in your own words. They are used exactly as you write them.
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
            style={{ position: 'absolute', top: -64, right: 0, fontSize: 48, fontWeight: 700, color: 'rgba(26,26,26,0.08)' }}
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
                style={{ fontWeight: 700, fontSize: 'clamp(22px, 6.4vw, 26px)', lineHeight: 1.25, color: '#1A1A1A' }}
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
                        marginTop: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: 48,
                        background: 'none',
                        border: 'none',
                        padding: '0 2px',
                        cursor: 'pointer',
                        fontFamily: 'var(--sv-font)',
                        fontSize: 13,
                        color: '#1A1A1A',
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
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={data.birthPlace}
                        onChange={(e) => onPlaceChange(e.target.value)}
                        onKeyDown={onEnterKey}
                        placeholder="Start typing a city..."
                        className="sv-field"
                        autoComplete="off"
                      />
                      {placeOpen && placeResults.length > 0 && (
                        <ul
                          style={{
                            listStyle: 'none', margin: 0, padding: 0,
                            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20,
                            background: '#FBFAF7',
                            WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
                            border: '1px solid #E4E0D6', borderRadius: 12,
                            overflow: 'hidden', boxShadow: 'none',
                          }}
                        >
                          {placeResults.map((item, idx) => (
                            <li key={`${item.lat}-${item.lon}-${idx}`}>
                              <button
                                type="button"
                                onClick={() => selectPlace(item)}
                                style={{
                                  display: 'flex', alignItems: 'center', width: '100%', minHeight: 48,
                                  padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                                  background: 'transparent', border: 'none',
                                  borderTop: idx === 0 ? 'none' : '1px solid #E4E0D6',
                                  color: '#1A1A1A', fontFamily: 'var(--sv-font)', fontSize: 15, lineHeight: 1.4,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(26,26,26,0.05)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                {formatPlace(item)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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

                    {/* Consent gate. The submit button stays disabled until this is
                        ticked, and submitting is what stamps users.consent_at. */}
                    <label
                      htmlFor="sv-consent"
                      style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 22, cursor: 'pointer' }}
                    >
                      <input
                        id="sv-consent"
                        type="checkbox"
                        required
                        checked={consented}
                        onChange={(e) => setConsented(e.target.checked)}
                        style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, accentColor: '#1A1A1A', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: 'var(--sv-font)', fontSize: 13, lineHeight: 1.6, color: '#9A9A9A' }}>
                        I understand my birth data and answers are used to generate my
                        Blueprint and are stored to keep my Ledger.
                      </span>
                    </label>

                    <p style={{ marginTop: 10, marginLeft: 32, fontFamily: 'var(--sv-font)', fontSize: 13, color: '#9A9A9A' }}>
                      <a href="/privacy" style={{ color: '#1A1A1A' }}>Privacy</a>
                      <span style={{ padding: '0 8px' }}>·</span>
                      <a href="/terms" style={{ color: '#1A1A1A' }}>Terms</a>
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
                marginTop: 8,
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 48,
                background: 'none',
                border: 'none',
                padding: '0 2px',
                cursor: 'pointer',
                fontFamily: 'var(--sv-font)',
                fontSize: 14,
                color: '#9A9A9A',
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
