import type { QuizData, BlueprintResult, Analytics } from '../types';

const KEYS = {
  QUIZ_DATA: 'sovrn_quiz_data',
  QUIZ_STEP: 'sovrn_quiz_step',
  BLUEPRINT: 'sovrn_blueprint',
  ANALYTICS: 'sovrn_analytics',
  LEADS: 'sovrn_leads',
} as const;

export function saveQuizData(data: QuizData): void {
  localStorage.setItem(KEYS.QUIZ_DATA, JSON.stringify(data));
}

export function getQuizData(): QuizData | null {
  const data = localStorage.getItem(KEYS.QUIZ_DATA);
  return data ? JSON.parse(data) : null;
}

/* Which question they were on. Kept next to the answers so leaving the quiz —
   to read the privacy page, or by closing the tab — costs a tap rather than
   eight answers. Under the sovrn_ prefix, so /delete clears it with the rest. */
export function saveQuizProgress(step: number): void {
  localStorage.setItem(KEYS.QUIZ_STEP, String(step));
}

export function getQuizProgress(): number {
  const raw = localStorage.getItem(KEYS.QUIZ_STEP);
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

export function clearQuizProgress(): void {
  localStorage.removeItem(KEYS.QUIZ_STEP);
}

export function saveBlueprint(result: BlueprintResult): void {
  localStorage.setItem(KEYS.BLUEPRINT, JSON.stringify(result));
}

export function getBlueprint(): BlueprintResult | null {
  const data = localStorage.getItem(KEYS.BLUEPRINT);
  return data ? JSON.parse(data) : null;
}

export function saveLead(name: string, email: string): void {
  const existing = localStorage.getItem(KEYS.LEADS);
  const leads: Array<{ name: string; email: string; date: string }> = existing
    ? JSON.parse(existing)
    : [];
  leads.push({ name, email, date: new Date().toISOString() });
  localStorage.setItem(KEYS.LEADS, JSON.stringify(leads));
}

export function getAnalytics(): Analytics {
  const data = localStorage.getItem(KEYS.ANALYTICS);
  return data
    ? JSON.parse(data)
    : { pageViews: {}, quizStarts: 0, quizCompletions: 0, ctaClicks: 0 };
}

export function trackEvent(
  event: 'pageView' | 'quizStart' | 'quizComplete' | 'ctaClick',
  page?: string
): void {
  const analytics = getAnalytics();
  switch (event) {
    case 'pageView':
      if (page) {
        analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;
      }
      break;
    case 'quizStart':
      analytics.quizStarts++;
      break;
    case 'quizComplete':
      analytics.quizCompletions++;
      break;
    case 'ctaClick':
      analytics.ctaClicks++;
      break;
  }
  localStorage.setItem(KEYS.ANALYTICS, JSON.stringify(analytics));
}
