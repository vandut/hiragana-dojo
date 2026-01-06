export interface SentenceData {
  hiragana: string;
  romaji: string;
  polishTranslation: string;
}

export interface WritingChallenge {
  polish: string;
  hiragana: string;
  romaji: string;
}

export interface WritingBatch {
  challenges: WritingChallenge[];
}

export interface VisualQuizData {
  originalSentence: string; // The full sentence in Hiragana
  maskedSentenceParts: [string, string]; // Part before and after the gap
  targetWord: string; // The word to guess (Hiragana)
  romaji: string;
  polishTranslation: string;
  imageBase64: string;
}

export interface AnalyzedVocabulary {
  validHiraganaWords: string[]; // Union of known + learning (ALL allowed words)
  learningWords: string[]; // Subset of words that are high priority
  allowedCharacters: string[];
}

export type WordStats = Record<string, number>;

export enum AppState {
  CONFIG = 'CONFIG',
  INPUT_WORDS = 'INPUT_WORDS',
  PRACTICE = 'PRACTICE'
}

export enum PracticeMode {
  READING = 'READING',
  WRITING = 'WRITING',
  VISUAL = 'VISUAL'
}

export type StatsUpdateHandler = (wordCounts: Record<string, number>) => void;