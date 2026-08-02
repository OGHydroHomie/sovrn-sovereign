import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import type { QuizData } from '../types';
import { saveQuizData, saveLead } from '../utils/storage';

interface Props {
  onComplete: (data: QuizData) => void;
  onBack: () => void;
}

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  'Birth Data',
  'Your Shadow',
  'Your Vision',
  'Deliver',
];

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

  const update = (field: keyof QuizData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!data.name && !!data.birthDate && !!data.birthPlace && (!!data.birthTime || data.birthTimeUnknown);
      case 1:
        return data.deepestFear.length >= 20;
      case 2:
        return data.desiredReality.length >= 20 && data.repeatingPattern.length >= 20;
      case 3:
        return !!data.email && data.email.includes('@');
      default:
        return false;
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      saveQuizData(data);
      saveLead(data.name, data.email);
      onComplete(data);
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
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="quiz-shell">
      <div className="relative z-10 w-full max-w-xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="brand-mark mb-6">SOVRN</div>

          {/* Progress — thin red line filling left to right */}
          <div className="progress-track mb-3">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <span className="quiz-meta">Step {step + 1} of {TOTAL_STEPS}</span>
            <span className="quiz-meta">{STEP_TITLES[step]}</span>
          </div>
        </motion.div>

        {/* Step content */}
        <div className="quiz-card min-h-[450px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col gap-6"
            >
              {step === 0 && (
                <>
                  <div>
                    <label className="field-label">
                      What is your name?
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your full name"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">
                      When did you arrive?
                    </label>
                    <input
                      type="date"
                      value={data.birthDate}
                      onChange={(e) => update('birthDate', e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">
                      What hour did you enter the world?
                    </label>
                    <input
                      type="time"
                      value={data.birthTime}
                      onChange={(e) => update('birthTime', e.target.value)}
                      disabled={data.birthTimeUnknown}
                      className="field-input"
                    />
                    <p className="field-helper mt-2">
                      As exact as you know. Check your birth certificate if unsure.
                    </p>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer quiz-meta">
                      <input
                        type="checkbox"
                        checked={data.birthTimeUnknown}
                        onChange={(e) => {
                          update('birthTimeUnknown', e.target.checked);
                          if (e.target.checked) update('birthTime', '');
                        }}
                        style={{ accentColor: '#DC2626' }}
                      />
                      I don't know my exact birth time
                    </label>
                  </div>
                  <div>
                    <label className="field-label">
                      Where were you born?
                    </label>
                    <input
                      type="text"
                      value={data.birthPlace}
                      onChange={(e) => update('birthPlace', e.target.value)}
                      placeholder="City, State or Country"
                      className="field-input"
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <div>
                  <label className="field-label">
                    Name the fear that runs your life — the one you've never said out loud.
                  </label>
                  <p className="field-helper mb-4">
                    Be specific. Not "failure" — but what failure would look like. Not
                    "rejection" — but whose rejection would break you and why. Write 2-3 sentences.
                  </p>
                  <textarea
                    value={data.deepestFear}
                    onChange={(e) => update('deepestFear', e.target.value)}
                    rows={6}
                    className="field-input resize-none"
                  />
                </div>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="field-label">
                      Describe a single day in the life you know you're meant to live.
                    </label>
                    <p className="field-helper mb-4">
                      Not the vision board. The Tuesday. What do you wake up to? What
                      work are you doing? Who is around you? Describe it like you're
                      remembering it, not imagining it. Write 3-4 sentences.
                    </p>
                    <textarea
                      value={data.desiredReality}
                      onChange={(e) => update('desiredReality', e.target.value)}
                      rows={5}
                      className="field-input resize-none"
                    />
                  </div>
                  <div>
                    <label className="field-label">
                      What is the one pattern you keep repeating no matter how many times
                      you swear you've broken it?
                    </label>
                    <p className="field-helper mb-4">
                      Describe the cycle, not the label. What triggers it? What do you do
                      when it starts? How does it end? Be honest about the loop — that's
                      where your blueprint finds the exit.
                    </p>
                    <textarea
                      value={data.repeatingPattern}
                      onChange={(e) => update('repeatingPattern', e.target.value)}
                      rows={5}
                      className="field-input resize-none"
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <div>
                  <label className="field-label">
                    Where do we send your blueprint?
                  </label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="your@email.com"
                    className="field-input"
                  />
                  <p className="field-helper mt-3">
                    Your Sovereign Blueprint will also be delivered here.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #E5E5E5' }}>
            <button onClick={prev} className="quiz-back">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={next}
              disabled={!canProceed()}
              className="btn-sovereign inline-flex items-center gap-2"
            >
              {step === TOTAL_STEPS - 1 ? 'Enter the Threshold' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
