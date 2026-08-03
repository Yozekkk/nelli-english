export type QuestionType = "single-choice" | "word-order" | "fill-gap" | "matching";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  /** Варианты ответа (single-choice) или слова для сборки (word-order) */
  options?: string[];
  /** Пары для сопоставления (matching) */
  pairs?: { left: string; right: string }[];
  correctAnswer: string | string[];
  explanation: string;
}

export interface Lesson {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  videoUrl: string;
  youtubeId: string;
  rules: string[];
  examples: string[];
  commonMistakes: string[];
  questions: Question[];
}

export const PLAYLIST_URL =
  "http://www.youtube.com/playlist?list=PLD6SPjEPomavd9p66Hme87w11KqPxthKV";
