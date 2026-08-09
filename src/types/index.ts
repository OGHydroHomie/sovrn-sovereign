export interface QuizData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  /* Resolved from the Q4 location autocomplete (optional; chart.ts still
     geocodes birthPlace itself — these are for records / future use). */
  latitude?: number;
  longitude?: number;
  deepestFear: string;
  desiredReality: string;
  repeatingPattern: string;
  email: string;
}

export interface BlueprintResult {
  text: string;
}

export type AppPage = 'threshold' | 'hero' | 'quiz' | 'loading' | 'blueprint';

export interface Analytics {
  pageViews: Record<string, number>;
  quizStarts: number;
  quizCompletions: number;
  ctaClicks: number;
}
