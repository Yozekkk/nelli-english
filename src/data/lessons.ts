import { lessons1to10 } from "./lessons-1-10";
import { lessons11to20 } from "./lessons-11-20";
import type { Lesson, Question } from "./types";

export type { Lesson, Question };
export { PLAYLIST_URL } from "./types";

export const lessons: Lesson[] = [...lessons1to10, ...lessons11to20];

export const getLesson = (id: number): Lesson | undefined =>
  lessons.find((lesson) => lesson.id === id);

export const totalQuestions = lessons.reduce((sum, l) => sum + l.questions.length, 0);
