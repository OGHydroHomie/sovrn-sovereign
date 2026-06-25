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
  soulArchitecture: {
    sunArchetype: {
      name: string;
      sign: string;
      degree: string;
      description: string;
    };
    risingArchetype: {
      name: string;
      sign: string;
      degree: string;
      description: string;
    };
    northNodeArchetype: {
      name: string;
      sign: string;
      degree: string;
      description: string;
    };
    sovereignFlame: string;
    coreQuote: string;
  };
  shadowPattern: {
    pattern: string;
    rootCause: string;
    keyQuote: string;
  };
  trueNorth: {
    direction: string;
    alignment: string;
    destiny: string;
  };
  firstSovereignAct: {
    instruction: string;
    reason: string;
    declaration: string;
  };
}

export type AppPage = 'hero' | 'quiz' | 'loading' | 'blueprint';

export interface Analytics {
  pageViews: Record<string, number>;
  quizStarts: number;
  quizCompletions: number;
  ctaClicks: number;
}
