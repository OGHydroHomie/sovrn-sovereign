import type { QuizData, BlueprintResult, Analytics } from '../types';

const KEYS = {
  QUIZ_DATA: 'sovrn_quiz_data',
  BLUEPRINT: 'sovrn_blueprint',
  ANALYTICS: 'sovrn_analytics',
  LEADS: 'sovrn_leads',
  THRESHOLD_SEEN: 'sovrn_threshold_seen',
} as const;

/* The full opening ceremony plays once (docs/art-direction.md, law 9). */
export function hasSeenThreshold(): boolean {
  return localStorage.getItem(KEYS.THRESHOLD_SEEN) === '1';
}

export function markThresholdSeen(): void {
  localStorage.setItem(KEYS.THRESHOLD_SEEN, '1');
}

export function saveQuizData(data: QuizData): void {
  localStorage.setItem(KEYS.QUIZ_DATA, JSON.stringify(data));
}

export function getQuizData(): QuizData | null {
  const data = localStorage.getItem(KEYS.QUIZ_DATA);
  return data ? JSON.parse(data) : null;
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
