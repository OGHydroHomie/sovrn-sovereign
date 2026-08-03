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

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-sm tracking-[0.4em] uppercase gold-glow font-medium mb-6">
            SOVRN
          </h2>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{
                    width: i < step ? '100%' : i === step ? '50%' : '0%',
                  }}
                  style={{
                    background:
                      i <= step
                        ? 'linear-gradient(135deg, #8b5cf6, #D4AF37)'
                        : 'transparent',
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
            <span>{STEP_TITLES[step]}</span>
          </div>
        </motion.div>

        {/* Step content */}
        <div className="glass-card p-8 md:p-10 min-h-[450px] flex flex-col">
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
                    <label className="sovereign-label block mb-3">
                      What is your name?
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your full name"
                      className="sovereign-input"
                    />
                  </div>
                  <div>
                    <label className="sovereign-label block mb-3">
                      When did you arrive?
                    </label>
                    <input
                      type="date"
                      value={data.birthDate}
                      onChange={(e) => update('birthDate', e.target.value)}
                      className="sovereign-input"
                    />
                  </div>
                  <div>
                    <label className="sovereign-label block mb-3">
                      What hour did you enter the world?
                    </label>
                    <input
                      type="time"
                      value={data.birthTime}
                      onChange={(e) => update('birthTime', e.target.value)}
                      disabled={data.birthTimeUnknown}
                      className="sovereign-input disabled:opacity-30"
                    />
                    <p className="sovereign-helper mt-2">
                      As exact as you know. Check your birth certificate if unsure.
                    </p>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer text-white/40 text-sm">
                      <input
                        type="checkbox"
                        checked={data.birthTimeUnknown}
                        onChange={(e) => {
                          update('birthTimeUnknown', e.target.checked);
                          if (e.target.checked) update('birthTime', '');
                        }}
                        style={{ accentColor: '#D4AF37' }}
                      />
                      I don't know my exact birth time
                    </label>
                  </div>
                  <div>
                    <label className="sovereign-label block mb-3">
                      Where were you born?
                    </label>
                    <input
                      type="text"
                      value={data.birthPlace}
                      onChange={(e) => update('birthPlace', e.target.value)}
                      placeholder="City, State or Country"
                      className="sovereign-input"
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <div>
                  <label className="sovereign-label block mb-3">
                    Name the fear that runs your life — the one you've never said out loud.
                  </label>
                  <p className="sovereign-helper mb-4">
                    Be specific. Not "failure" — but what failure would look like. Not
                    "rejection" — but whose rejection would break you and why. Write 2-3 sentences.
                  </p>
                  <textarea
                    value={data.deepestFear}
                    onChange={(e) => update('deepestFear', e.target.value)}
                    rows={6}
                    className="sovereign-input resize-none"
                  />
                </div>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="sovereign-label block mb-3">
                      Describe a single day in the life you know you're meant to live.
                    </label>
                    <p className="sovereign-helper mb-4">
                      Not the vision board. The Tuesday. What do you wake up to? What
                      work are you doing? Who is around you? Describe it like you're
                      remembering it, not imagining it. Write 3-4 sentences.
                    </p>
                    <textarea
                      value={data.desiredReality}
                      onChange={(e) => update('desiredReality', e.target.value)}
                      rows={5}
                      className="sovereign-input resize-none"
                    />
                  </div>
                  <div>
                    <label className="sovereign-label block mb-3">
                      What is the one pattern you keep repeating no matter how many times
                      you swear you've broken it?
                    </label>
                    <p className="sovereign-helper mb-4">
                      Describe the cycle, not the label. What triggers it? What do you do
                      when it starts? How does it end? Be honest about the loop — that's
                      where your blueprint finds the exit.
                    </p>
                    <textarea
                      value={data.repeatingPattern}
                      onChange={(e) => update('repeatingPattern', e.target.value)}
                      rows={5}
                      className="sovereign-input resize-none"
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <div>
                  <label className="sovereign-label block mb-3">
                    Where do we send your blueprint?
                  </label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="your@email.com"
                    className="sovereign-input"
                  />
                  <p className="sovereign-helper mt-3">
                    Your Sovereign Blueprint will also be delivered here.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              onClick={prev}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={next}
              disabled={!canProceed()}
              className="sovereign-button flex items-center gap-2"
            >
              {step === TOTAL_STEPS - 1 ? 'Reveal My Blueprint' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
