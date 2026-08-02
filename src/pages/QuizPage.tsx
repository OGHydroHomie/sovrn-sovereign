import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizData } from '../types';
import { saveQuizData, saveLead } from '../utils/storage';

interface Props {
  onComplete: (data: QuizData) => void;
  onBack: () => void;
}

type FieldKey =
  | 'birthDate'
  | 'birthTime'
  | 'birthPlace'
  | 'deepestFear'
  | 'desiredReality'
  | 'repeatingPattern'
  | 'email';

interface Question {
  field: FieldKey;
  label: string;
  helper?: string;
  type: 'date' | 'time' | 'text' | 'email' | 'textarea';
  placeholder?: string;
  cta: string;
}

const QUESTIONS: Question[] = [
  {
    field: 'birthDate',
    label: 'When did you arrive?',
    type: 'date',
    placeholder: 'MM / DD / YYYY',
    cta: 'Next',
  },
  {
    field: 'birthTime',
    label: 'What hour did you enter the world?',
    helper: 'As exact as you know. Check your birth certificate.',
    type: 'time',
    cta: 'Next',
  },
  {
    field: 'birthPlace',
    label: 'Where were you born?',
    type: 'text',
    placeholder: 'City, State, Country',
    cta: 'Next',
  },
  {
    field: 'deepestFear',
    label: "Name the fear that runs your life — the one you've never said out loud.",
    helper: "Be specific. Not 'failure' — what failure would look like. Write 2-3 sentences.",
    type: 'textarea',
    cta: 'Next',
  },
  {
    field: 'desiredReality',
    label: "Describe a single day in the life you know you're meant to live.",
    helper: 'Not the vision board. The Tuesday. What do you wake up to?',
    type: 'textarea',
    cta: 'Next',
  },
  {
    field: 'repeatingPattern',
    label: 'What is the one pattern you keep repeating no matter how many times you swear you’ve broken it?',
    helper: 'Describe the cycle, not the label.',
    type: 'textarea',
    cta: 'Next',
  },
  {
    field: 'email',
    label: 'Where do we send your blueprint?',
    helper: 'Your blueprint will also be delivered here.',
    type: 'email',
    placeholder: 'you@email.com',
    cta: 'Enter the Threshold',
  },
];

const TOTAL = QUESTIONS.length;

// Derive a personalization name from the email local-part so the backend
// (which requires a non-empty name) keeps working without an extra screen.
function nameFromEmail(email: string): string {
  const local = (email.split('@')[0] || '').replace(/[._-]+/g, ' ').trim();
  if (!local) return 'Sovereign';
  return local
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function QuizPage({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
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

  const q = QUESTIONS[step];

  const update = (field: FieldKey, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (q.field) {
      case 'birthDate':
        return !!data.birthDate;
      case 'birthTime':
        return !!data.birthTime || data.birthTimeUnknown;
      case 'birthPlace':
        return data.birthPlace.trim().length > 0;
      case 'deepestFear':
        return data.deepestFear.trim().length >= 20;
      case 'desiredReality':
        return data.desiredReality.trim().length >= 20;
      case 'repeatingPattern':
        return data.repeatingPattern.trim().length >= 20;
      case 'email':
        return /\S+@\S+\.\S+/.test(data.email);
      default:
        return false;
    }
  };

  const next = () => {
    if (!canProceed()) return;
    if (step < TOTAL - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      const finalData: QuizData = { ...data, name: nameFromEmail(data.email) };
      saveQuizData(finalData);
      saveLead(finalData.name, finalData.email);
      onComplete(finalData);
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const progress = ((step + 1) / TOTAL) * 100;
  const numberLabel = String(step + 1).padStart(2, '0');

  return (
    <div className="app-screen flex flex-col px-6 pt-6 pb-8" style={{ maxWidth: 420, margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: '#E5E5E5', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: '#DC2626', borderRadius: 999 }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
        <span className="sovrn-wordmark">SOVRN</span>
        <span style={{ color: '#9A9A9A', fontSize: 12, fontWeight: 500 }}>
          {step + 1} / {TOTAL}
        </span>
      </div>

      {/* Question body */}
      <div className="relative flex-1 flex flex-col justify-center" style={{ overflow: 'hidden' }}>
        {/* Large ghost number, top right */}
        <span
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            fontSize: 48,
            fontWeight: 700,
            color: '#E5E5E5',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {numberLabel}
        </span>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ width: '100%' }}
          >
            <label
              htmlFor={`q-${q.field}`}
              style={{
                display: 'block',
                color: '#DC2626',
                fontSize: 20,
                fontWeight: 500,
                lineHeight: 1.35,
                maxWidth: 300,
                marginBottom: 20,
              }}
            >
              {q.label}
            </label>

            {q.type === 'textarea' ? (
              <textarea
                id={`q-${q.field}`}
                className="app-textarea"
                value={data[q.field] as string}
                onChange={(e) => update(q.field, e.target.value)}
                autoFocus
              />
            ) : (
              <input
                id={`q-${q.field}`}
                className="app-field"
                type={q.type}
                inputMode={q.type === 'email' ? 'email' : undefined}
                placeholder={q.placeholder}
                value={data[q.field] as string}
                onChange={(e) => update(q.field, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && q.type !== 'textarea') {
                    e.preventDefault();
                    next();
                  }
                }}
                disabled={q.field === 'birthTime' && data.birthTimeUnknown}
                autoFocus
              />
            )}

            {q.helper && (
              <p style={{ color: '#9A9A9A', fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
                {q.helper}
              </p>
            )}

            {/* Birth-time unknown escape hatch (preserves backend feature) */}
            {q.field === 'birthTime' && (
              <label
                className="flex items-center gap-2"
                style={{ marginTop: 16, color: '#9A9A9A', fontSize: 14, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={data.birthTimeUnknown}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      birthTimeUnknown: e.target.checked,
                      birthTime: e.target.checked ? '' : prev.birthTime,
                    }))
                  }
                  style={{ accentColor: '#DC2626', width: 18, height: 18 }}
                />
                I don't know my exact birth time
              </label>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div>
        <button onClick={next} disabled={!canProceed()} className="app-button">
          {q.cta}
        </button>
        <button
          onClick={prev}
          className="block"
          style={{
            background: 'none',
            border: 'none',
            color: '#9A9A9A',
            fontSize: 14,
            fontWeight: 400,
            marginTop: 16,
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
