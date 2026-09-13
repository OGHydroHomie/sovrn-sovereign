import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import Fade from '../components/Fade';
import AscentField, { CLIMB_MS } from '../components/AscentField';
import Dictate from '../components/Dictate';
import { typeIsPaper, HERO_STARS, TOP } from '../lib/ascent';
import { EASE, prefersReducedMotion } from '../lib/motion';
import type { QuizData } from '../types';
import { saveQuizData, saveLead, getQuizData, saveQuizProgress, getQuizProgress, clearQuizProgress } from '../utils/storage';
import { captureEmail } from '../lib/capture';
import { recordConsent } from '../lib/session';

/* The small caps over each part of a date. Its contrast is checked with
   everything else on the screen — a label nobody can read is a field with no
   name on it. */
const PART_LABEL: React.CSSProperties = {
  display: 'block', marginBottom: 7,
  fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--sv-mute)',
};

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
  /* Restored, not reset. Answers and position are written on every change, so
     opening the privacy page mid-quiz costs a tap rather than eight answers. */
  const [step, setStep] = useState(() => Math.min(getQuizProgress(), TOTAL - 1));
  const [consented, setConsented] = useState(false);
  const [, setDirection] = useState(1);
  const [phase, setPhase] = useState<'quiz' | 'reveal'>('quiz');
  const revealTimer = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Q4 location autocomplete
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placeOpen, setPlaceOpen] = useState(false);
  const placeTimer = useRef<number | null>(null);

  const [data, setData] = useState<QuizData>(() => ({

    name: '',
    birthDate: '',
    birthTime: '',
    birthTimeUnknown: false,
    birthPlace: '',
    deepestFear: '',
    desiredReality: '',
    repeatingPattern: '',
    email: '',
    ...(getQuizData() ?? {}),
  }));

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

  /* The climb.

     Steps 5 through 8 are the four altitudes — the fear, the life, the pattern,
     and the birth details at the top. Everything before them is on paper with no
     field at all, which is why the climb has a first step rather than starting
     at question one.

       0.0s  the field begins to descend, density interpolating with it
       0.2s  the question fades out
       0.9s  the next question fades in
       1.2s  settled, and another move is allowed

     The step itself changes at 0.9s rather than at 0.0s: the text has to be gone
     before it is replaced, and the palette inverts with the step, so the type
     changes colour in the gap where nobody can see it happen. */
  const CLIMB_FIRST = 4;
  /* The field is behind every question now, not only the climb.

     Questions one to four used to be on paper, which put a screen at 245
     luminance between two at 10 and 17 — the flicker the dark threshold was
     meant to end, moved one screen later. They sit at the stars, which is where
     the door left everyone, and the descent into the depths happens at question
     five exactly as the climb was designed. */
  const onClimb = phase === 'quiz';
  const altitudeAt = (n: number) => (n < CLIMB_FIRST ? TOP : n - CLIMB_FIRST);
  const altitude = altitudeAt(step);

  const [climbTo, setClimbTo] = useState(altitude);
  const [climbing, setClimbing] = useState(false);
  const qRef = useRef<HTMLDivElement>(null);
  /* The whole column the person is working in — question, field, and both
     controls. The clearing is measured from this rather than from the question
     alone, because "Back" sits below the question and at ground level it was
     landing in the dense ground with nothing behind it to read against. */
  const columnRef = useRef<HTMLDivElement>(null);
  /* The decorative question number. It is positioned outside the column, so it
     needs naming separately or the hole does not cover it and it vanishes into
     the grain — which is what it did. */
  const numberRef = useRef<HTMLDivElement>(null);
  const climbTimers = useRef<number[]>([]);

  useEffect(() => () => { climbTimers.current.forEach(clearTimeout); }, []);

  /* The wrapper is faded out by hand on the way out; the Fade inside handles the
     way in. Reset it the moment the new step mounts or the second question of
     the climb would arrive already invisible. */
  useLayoutEffect(() => {
    if (qRef.current) gsap.set(qRef.current, { opacity: 1 });
  }, [step]);

  /* Move between two altitudes. Returns false if it declined — either because a
     move is already running, or because there is no field to move. */
  const climb = (nextStep: number, dir: 1 | -1): boolean => {
    if (climbing) return false;
    if (nextStep < 0 || nextStep > TOTAL - 1) return false;
    /* Only when the altitude actually changes. The first four questions are all
       at the stars, and making each of them wait 1.2s for a field that is not
       moving would be ceremony charged to someone typing their name. */
    if (altitudeAt(nextStep) === altitudeAt(step)) return false;

    const reduced = prefersReducedMotion();
    setClimbTo(altitudeAt(nextStep));

    if (reduced) {
      /* No movement, and no waiting on a movement that is not happening. The
         field still changes density between the two altitudes — that is the
         information — and the question is simply replaced. */
      window.scrollTo(0, 0);
      goTo(nextStep, dir);
      return true;
    }

    setClimbing(true);
    climbTimers.current.forEach(clearTimeout);
    climbTimers.current = [
      window.setTimeout(() => {
        if (qRef.current) {
          gsap.to(qRef.current, { opacity: 0, duration: 0.3, ease: EASE.out });
        }
      }, 200),
      window.setTimeout(() => {
        window.scrollTo(0, 0);
        goTo(nextStep, dir);
      }, 900),
      /* A floor under the lock. The field reports when it settles, but if it
         were ever unmounted mid-move nothing would report anything, and the
         quiz would be stuck with no way forward. */
      window.setTimeout(() => setClimbing(false), CLIMB_MS + 120),
    ];
    return true;
  };

  const advance = () => {
    if (!canProceed() || climbing) return;

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
      if (climb(step + 1, 1)) return;
      window.scrollTo(0, 0);
      goTo(step + 1, 1);
    } else {
      // Q8 submit — persist, capture the lead in Supabase, kick off generation.
      // Capture is non-blocking: it runs alongside chart calc + stream.
      saveQuizData(data);
      clearQuizProgress();
      saveLead(data.name, data.email);
      void recordConsent();
      void captureEmail(data.email, 'quiz');
      onComplete(data);
    }
  };

  const back = () => {
    if (climbing) return;
    if (step > 0) {
      /* Going back down is the same move in reverse, for the same reason it is
         the same move forward: the ground has to come back up to meet you. */
      if (climb(step - 1, -1)) return;
      window.scrollTo(0, 0);
      goTo(step - 1, -1);
    } else {
      onBack();
    }
  };

  /* Birth date and time, as parts.
   *
   * The native date and time pickers were the last two things on the path that
   * could not be made dark: a browser's own control carries its own palette, and
   * `color-scheme: light` on the field was there precisely to stop them
   * rendering white-on-white. Plain numeric inputs are the only way to own them.
   *
   * The parts are the source of truth while someone is typing; the composed
   * ISO strings the chart needs are derived from them. Typing "1" into the year
   * must not produce a birth date of the year 1. */
  const [dob, setDob] = useState({ day: '', month: '', year: '' });
  const [tob, setTob] = useState({ hour: '', minute: '', meridiem: '' as '' | 'AM' | 'PM' });

  const setDobPart = (key: 'day' | 'month' | 'year', v: string) => {
    const next = { ...dob, [key]: v };
    setDob(next);
    const d = Number(next.day), m = Number(next.month), y = Number(next.year);
    const whole = next.year.length === 4 && d >= 1 && d <= 31 && m >= 1 && m <= 12
      && y >= 1900 && y <= new Date().getFullYear();
    /* And the date has to exist: the 31st of February is four valid numbers. */
    const real = whole && (() => {
      const probe = new Date(Date.UTC(y, m - 1, d));
      return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
    })();
    update('birthDate', real
      ? `${next.year}-${next.month.padStart(2, '0')}-${next.day.padStart(2, '0')}`
      : '');
  };

  /* Twelve-hour in, twenty-four-hour out.
   *
   * The field used to take 0-23 and this is an American product: question three
   * is early enough that a person who has to work out what 3pm is in
   * twenty-four-hour time simply leaves. What is stored has not changed — the
   * chart wants "15:04" and still gets it — but nobody is asked to do the
   * conversion themselves.
   *
   * Midnight and noon are the two that catch every implementation of this:
   * 12 AM is hour zero and 12 PM is hour twelve, and neither is "12 plus or
   * minus nothing". */
  const to24 = (hour: string, meridiem: 'AM' | 'PM'): number => {
    const h = Number(hour);
    if (meridiem === 'AM') return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  };

  const commitTob = (next: typeof tob) => {
    setTob(next);
    const h = Number(next.hour), mi = Number(next.minute);
    const whole = next.hour !== '' && next.minute !== '' && next.meridiem !== ''
      && h >= 1 && h <= 12 && mi >= 0 && mi <= 59;
    /* Unset is not AM. Defaulting the toggle would record half past three in
       the morning for somebody born in the afternoon and never tell them, which
       is the one failure here that does not announce itself. */
    update('birthTime', whole
      ? `${String(to24(next.hour, next.meridiem as 'AM' | 'PM')).padStart(2, '0')}:${next.minute.padStart(2, '0')}`
      : '');
    if (whole) update('birthTimeUnknown', false);
  };

  const setTobPart = (key: 'hour' | 'minute', v: string) => {
    const next = { ...tob, [key]: v };

    /* Somebody who already thinks in twenty-four-hour time types 18 and should
       not be punished for it. Only on a complete two-digit entry, so the 1 of
       a 12 is never mangled on its way past. */
    if (key === 'hour' && v.length === 2) {
      const h = Number(v);
      if (h === 0) { next.hour = '12'; next.meridiem = 'AM'; }
      else if (h > 12 && h <= 23) { next.hour = String(h - 12); next.meridiem = 'PM'; }
    }

    commitTob(next);
  };

  const setMeridiem = (meridiem: 'AM' | 'PM') => commitTob({ ...tob, meridiem });

  const skipTime = () => {
    setTob({ hour: '', minute: '', meridiem: '' });
    update('birthTimeUnknown', true);
    update('birthTime', '');
    window.scrollTo(0, 0);
    goTo(3, 1);
  };

  /* Swipe to climb. The three deep questions are textareas, so a key binding is
     not available — space and return belong to whoever is writing in them. A
     vertical drag is the only gesture the form is not already using. */
  const touch = useRef<{ y: number; t: number } | null>(null);
  const SWIPE_PX = 64;
  const SWIPE_MS = 800;

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || climbing) return;
    /* A drag inside a scrolled textarea is someone selecting text, not climbing. */
    const target = e.target as HTMLElement | null;
    if (target && target.closest('textarea, input')) return;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Date.now() - start.t > SWIPE_MS) return;
    if (dy < -SWIPE_PX) advance();
    else if (dy > SWIPE_PX) back();
  };

  const onEnterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed()) advance();
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

  useEffect(() => { saveQuizData(data); }, [data]);
  useEffect(() => { saveQuizProgress(step); }, [step]);

  /* The bar tracks a value across quiz and reveal, so it is tweened to width
     rather than re-entered. */
  useEffect(() => {
    if (!progressRef.current) return;
    const tween = gsap.to(progressRef.current, {
      width: `${progressValue}%`,
      duration: prefersReducedMotion() ? 0.01 : 0.5,
      ease: EASE.in,
    });
    return () => { tween.kill(); };
  }, [progressValue]);

  /* The type inverts with the step, not with the field's live position, so the
     colour changes at 0.9s — inside the gap where the question is faded out. */
  const paperType = onClimb && typeIsPaper(altitude);

  return (
    <div
      data-climb={onClimb ? '' : undefined}
      data-tone={paperType ? 'paper' : undefined}
      onTouchStart={onClimb ? onTouchStart : undefined}
      onTouchEnd={onClimb ? onTouchEnd : undefined}
      style={{
        minHeight: '100svh', display: 'flex', flexDirection: 'column', padding: '0 20px',
        position: 'relative',
        /* The field is fixed behind everything; this keeps the questions above it. */
        ...(onClimb ? { color: 'var(--sv-ink)' } : {}),
      }}
    >
      {onClimb && (
        <AscentField
          altitude={climbTo}
          onSettled={() => setClimbing(false)}
          clearFor={[columnRef, numberRef]}
          progress={progressValue / 100}
          /* At the stars, the same rarity the door handed over on — so the field
             behind question one is the field the door opened into, not a denser
             one that happens to share a name. */
          {...(climbTo >= TOP ? HERO_STARS : {})}
        />
      )}
      {/* Progress bar — persistent across quiz + reveal so it animates 48 → 55 → 64 */}
      {/* On the climb the field draws this itself, in its own material. Two of
          them would be the same information twice, and the DOM one is the half
          that looks like a control panel. */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 24, maxWidth: 480, width: '100%', margin: '0 auto', visibility: onClimb ? 'hidden' : 'visible' }}>
        <div style={{ height: 3, borderRadius: 999, background: '#E4E0D6', overflow: 'hidden' }}>
          <div
            ref={progressRef}
            style={{ height: '100%', width: 0, borderRadius: 999, background: '#000000' }}
          />
        </div>
      </div>

      {phase === 'reveal' ? (
        /* ── Chart-insight reveal — auto-advances after 4s ── */
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: 40 }}>
          <Fade duration={0.8} y={10}>
            <p className="sv-label" style={{ fontSize: 11, color: '#6E6A66', letterSpacing: '0.22em', fontWeight: 700 }}>
              That was the easy part
            </p>
            <div
              style={{
                marginTop: 18, fontFamily: 'var(--sv-font)', fontWeight: 300,
                fontSize: 'clamp(22px, 6.4vw, 26px)', lineHeight: 1.3,
                color: '#1A1A1A', maxWidth: 300,
              }}
            >
              The next three are about you.
            </div>
            <p style={{ marginTop: 16, fontFamily: 'var(--sv-font)', fontWeight: 300, fontSize: 14, lineHeight: 1.6, color: '#6E6A66', maxWidth: 300 }}>
              Answer them in your own words. They are used exactly as you write them.
            </p>
          </Fade>
        </div>
      ) : (
      /* ── Question body — one per screen, vertically centered ── */
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div ref={columnRef} style={{ position: 'relative', maxWidth: 340, width: '100%', margin: '0 auto', paddingBottom: 40 }}>
          {/* Decorative question number */}
          <div
            ref={numberRef}
            className="sv-label"
            aria-hidden="true"
            style={{ position: 'absolute', top: -64, right: 0, fontSize: 48, fontWeight: 700, color: 'var(--sv-ghost)' }}
          >
            {q.n}
          </div>

          {/* The wrapper is what leaves; the Fade inside is what arrives. Two
              elements because the outgoing question has to be faded by hand at
              0.2s while the incoming one is still 700ms away from existing. */}
          <div ref={qRef}>
          <Fade key={step} duration={0.3} y={10}>
              <h2
                className="sv-display"
                style={{ fontWeight: 700, fontSize: 'clamp(22px, 6.4vw, 26px)', lineHeight: 1.25, color: 'var(--sv-ink)' }}
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
                  <div style={{ display: 'flex', gap: 12 }}>
                    {([
                      ['day', 'DD', 2, dob.day],
                      ['month', 'MM', 2, dob.month],
                      ['year', 'YYYY', 4, dob.year],
                    ] as const).map(([key, ph, len, val], i) => (
                      <div key={key} style={{ flex: key === 'year' ? 1.6 : 1 }}>
                        <label htmlFor={`dob-${key}`} className="sv-label" style={PART_LABEL}>{key}</label>
                        <input
                          id={`dob-${key}`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          autoFocus={i === 0}
                          maxLength={len}
                          value={val}
                          placeholder={ph}
                          onChange={(e) => setDobPart(key, e.target.value.replace(/\D/g, '').slice(0, len))}
                          onKeyDown={onEnterKey}
                          className="sv-field"
                          style={{ textAlign: 'center', letterSpacing: '0.08em' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                      {([['hour', 'HH', tob.hour], ['minute', 'MM', tob.minute]] as const).map(([key, ph, val], i) => (
                        <div key={key} style={{ flex: 1 }}>
                          <label htmlFor={`tob-${key}`} className="sv-label" style={PART_LABEL}>{key}</label>
                          <input
                            id={`tob-${key}`}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            autoFocus={i === 0}
                            maxLength={2}
                            value={val}
                            placeholder={ph}
                            onChange={(e) => setTobPart(key, e.target.value.replace(/\D/g, '').slice(0, 2))}
                            onKeyDown={onEnterKey}
                            className="sv-field"
                            style={{ textAlign: 'center', letterSpacing: '0.08em' }}
                          />
                        </div>
                      ))}

                      {/* Two states, both visible, neither preselected.
                          A default here would be a silent twelve-hour error for
                          half the people who use it, so the question is asked
                          rather than assumed — and until it is answered the
                          time is incomplete and Next stays shut. */}
                      <div
                        role="group"
                        aria-label="AM or PM"
                        style={{ flex: 'none', display: 'flex', gap: 0, paddingBottom: 1 }}
                      >
                        {(['AM', 'PM'] as const).map((m, i) => {
                          const on = tob.meridiem === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              id={`tob-${m.toLowerCase()}`}
                              aria-pressed={on}
                              onClick={() => setMeridiem(m)}
                              className="sv-label"
                              style={{
                                minWidth: 48, minHeight: 48,
                                marginLeft: i === 0 ? 0 : -1,
                                background: on ? 'var(--sv-ink)' : 'transparent',
                                color: on ? 'var(--sv-paper)' : 'var(--sv-mute)',
                                border: '1px solid var(--sv-line)',
                                borderRadius: 0,
                                cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                                transition: 'background 0.15s ease, color 0.15s ease',
                              }}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="sv-serif" style={{ marginTop: 10, fontSize: 13, color: 'var(--sv-mute)', lineHeight: 1.5 }}>
                      {q.helper}
                    </p>
                    <button
                      type="button"
                      onClick={skipTime}
                      style={{
                        marginTop: 14,
                        display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        width: '100%', minHeight: 48,
                        background: 'none',
                        border: '1px solid var(--sv-line)',
                        borderRadius: 2,
                        padding: '14px 18px',
                        cursor: 'pointer',
                        fontFamily: 'var(--sv-font)',
                        fontWeight: 400,
                        fontSize: 14,
                        letterSpacing: '0.02em',
                        color: 'var(--sv-ink)',
                      }}
                    >
                      I don&rsquo;t know my birth time
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
                            background: '#0C0C0B',
                            border: '1px solid rgba(251,250,247,0.28)', borderRadius: 2,
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
                                  borderTop: idx === 0 ? 'none' : '1px solid rgba(251,250,247,0.16)',
                                  color: 'var(--sv-ink)', fontFamily: 'var(--sv-font)', fontSize: 15, lineHeight: 1.4,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(251,250,247,0.10)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                {formatPlace(item)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="sv-serif" style={{ marginTop: 10, fontSize: 13, color: 'var(--sv-mute)', lineHeight: 1.5 }}>
                      {q.helper}
                    </p>
                  </>
                )}

                {(step === 4 || step === 5 || step === 6) && (
                  <>
                    <p className="sv-serif" style={{ marginBottom: 12, fontSize: 13, color: 'var(--sv-mute)', lineHeight: 1.5 }}>
                      {q.helper}
                    </p>
                    {(() => {
                      const key = step === 4 ? 'deepestFear' : step === 5 ? 'desiredReality' : 'repeatingPattern';
                      const val = step === 4 ? data.deepestFear : step === 5 ? data.desiredReality : data.repeatingPattern;
                      return (
                        <div style={{ position: 'relative' }}>
                          <textarea
                            autoFocus
                            value={val}
                            onChange={(e) => update(key, e.target.value)}
                            className="sv-textarea"
                            style={{ paddingRight: 46 }}
                          />
                          <Dictate
                            value={val}
                            onChange={(next) => update(key, next)}
                            label="Say it instead"
                          />
                        </div>
                      );
                    })()}
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
                    <p className="sv-serif" style={{ marginTop: 10, fontSize: 13, color: 'var(--sv-mute)', lineHeight: 1.5 }}>
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
                      <span style={{ fontFamily: 'var(--sv-font)', fontSize: 13, lineHeight: 1.6, color: 'var(--sv-mute)' }}>
                        I understand my birth data and answers are used to generate my
                        Blueprint and are stored to keep my Ledger.
                      </span>
                    </label>

                    <p style={{ marginTop: 10, marginLeft: 32, fontFamily: 'var(--sv-font)', fontSize: 13, color: 'var(--sv-mute)' }}>
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sv-ink)' }}>Privacy</a>
                      <span style={{ padding: '0 8px' }}>·</span>
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sv-ink)' }}>Terms</a>
                    </p>
                  </>
                )}
              </div>
          </Fade>
          </div>

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
                color: 'var(--sv-mute)',
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
