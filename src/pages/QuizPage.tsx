import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Star } from 'lucide-react';
import type { QuizData } from '../types';
import { saveQuizData, saveLead } from '../utils/storage';

interface Props {
  onComplete: (data: QuizData) => void;
  onBack: () => void;
}

const STEPS = [
  { title: 'Cosmic Data', subtitle: 'Tell us about your birth chart' },
  { title: 'Business Data', subtitle: 'Where you are right now' },
  { title: 'Ideal Client', subtitle: 'Who you\'re meant to serve' },
  { title: 'Contact', subtitle: 'Where to send your blueprint' },
];

const REVENUE_OPTIONS = [
  'Less than $5K/month',
  '$5K - $10K/month',
  '$10K - $20K/month',
  '$20K - $50K/month',
  '$50K+/month',
];

const CHALLENGE_OPTIONS = [
  'Inconsistent leads',
  'Low conversions',
  'Underpricing',
  'Attracting wrong clients',
  'Burnout',
  'No systems in place',
];

const CHANNEL_OPTIONS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'LinkedIn',
  'Organic / SEO',
  'Paid Ads',
  'Referrals',
];

export default function QuizPage({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<QuizData>({
    birthDate: '',
    birthTime: '',
    birthTimeUnknown: false,
    birthPlace: '',
    revenue: '',
    transformation: '',
    challenge: '',
    dreamClient: '',
    marketingChannel: '',
    name: '',
    email: '',
  });

  const update = (field: keyof QuizData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!data.birthDate && !!data.birthPlace && (!!data.birthTime || data.birthTimeUnknown);
      case 1:
        return !!data.revenue && !!data.transformation && !!data.challenge;
      case 2:
        return !!data.dreamClient && !!data.marketingChannel;
      case 3:
        return !!data.name && !!data.email && data.email.includes('@');
      default:
        return false;
    }
  };

  const next = () => {
    if (step < 3) {
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
          <h2 className="text-sm tracking-[0.4em] uppercase text-cosmic-purple-light font-medium mb-6">
            SOVRN
          </h2>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-4">
            {STEPS.map((_, i) => (
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
                        ? 'linear-gradient(135deg, #8b5cf6, #f59e0b)'
                        : 'transparent',
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Step {step + 1} of 4</span>
            <span>{STEPS[step].title}</span>
          </div>
        </motion.div>

        {/* Step content */}
        <div className="glass-card p-8 md:p-10 min-h-[400px] flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-cosmic-gold" />
            <h3 className="text-xl font-semibold">{STEPS[step].title}</h3>
          </div>
          <p className="text-white/50 text-sm mb-8">{STEPS[step].subtitle}</p>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col gap-5"
            >
              {step === 0 && (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What's your birth date?
                    </label>
                    <input
                      type="date"
                      value={data.birthDate}
                      onChange={(e) => update('birthDate', e.target.value)}
                      className="cosmic-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What time were you born?
                    </label>
                    <input
                      type="time"
                      value={data.birthTime}
                      onChange={(e) => update('birthTime', e.target.value)}
                      disabled={data.birthTimeUnknown}
                      className="cosmic-input disabled:opacity-40"
                    />
                    <label className="flex items-center gap-2 mt-2 text-sm text-white/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.birthTimeUnknown}
                        onChange={(e) => {
                          update('birthTimeUnknown', e.target.checked);
                          if (e.target.checked) update('birthTime', '');
                        }}
                        className="accent-cosmic-purple"
                      />
                      I don't know my exact birth time
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Where were you born?
                    </label>
                    <input
                      type="text"
                      value={data.birthPlace}
                      onChange={(e) => update('birthPlace', e.target.value)}
                      placeholder="e.g., Los Angeles, CA"
                      className="cosmic-input"
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What's your current monthly revenue?
                    </label>
                    <select
                      value={data.revenue}
                      onChange={(e) => update('revenue', e.target.value)}
                      className="cosmic-select"
                    >
                      <option value="">Select your revenue range</option>
                      {REVENUE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What type of transformation do you help people with?
                    </label>
                    <textarea
                      value={data.transformation}
                      onChange={(e) => update('transformation', e.target.value)}
                      placeholder="Describe in 2-3 sentences..."
                      rows={3}
                      className="cosmic-input resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What's your #1 business challenge right now?
                    </label>
                    <select
                      value={data.challenge}
                      onChange={(e) => update('challenge', e.target.value)}
                      className="cosmic-select"
                    >
                      <option value="">Select your biggest challenge</option>
                      {CHALLENGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Describe your dream client in one sentence
                    </label>
                    <input
                      type="text"
                      value={data.dreamClient}
                      onChange={(e) => update('dreamClient', e.target.value)}
                      placeholder="e.g., Female coaches earning $5-10K who want to scale to $50K"
                      className="cosmic-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What's your primary marketing channel?
                    </label>
                    <select
                      value={data.marketingChannel}
                      onChange={(e) =>
                        update('marketingChannel', e.target.value)
                      }
                      className="cosmic-select"
                    >
                      <option value="">Select your main channel</option>
                      {CHANNEL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What's your name?
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your full name"
                      className="cosmic-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      What's your email?
                    </label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="you@example.com"
                      className="cosmic-input"
                    />
                    <p className="text-xs text-white/30 mt-2">
                      We'll send your blueprint here. No spam, ever.
                    </p>
                  </div>
                </>
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
              className="glow-button !py-3 !px-8 !text-base disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:transform-none flex items-center gap-2"
            >
              {step === 3 ? 'Generate My Blueprint' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
