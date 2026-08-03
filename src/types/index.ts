export interface QuizData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  deepestFear: string;
  desiredReality: string;
  repeatingPattern: string;
  email: string;
}

export interface BlueprintResult {
  text: string;
}

export type AppPage = 'hero' | 'quiz' | 'loading' | 'blueprint';

export interface Analytics {
  pageViews: Record<string, number>;
  quizStarts: number;
  quizCompletions: number;
  ctaClicks: number;
}
