import { useCallback, useEffect, useState } from "react";

export interface LessonProgress {
  watched: boolean;
  attempts: number;
  lastScore: number | null;
  bestScore: number | null;
  lastAnswers: number | null;
  lastTotal: number | null;
  correctAnswers: number;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  sequentialMode: boolean;
  streak: number;
  lastDailyDate: string | null;
  dailyDone: boolean;
}

const STORAGE_KEY = "english-step-progress-v1";
const EVENT = "english-step-progress-change";

export const emptyLessonProgress: LessonProgress = {
  watched: false,
  attempts: 0,
  lastScore: null,
  bestScore: null,
  lastAnswers: null,
  lastTotal: null,
  correctAnswers: 0,
};

export const defaultState: ProgressState = {
  lessons: {},
  sequentialMode: false,
  streak: 0,
  lastDailyDate: null,
  dailyDone: false,
};

function read(): ProgressState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return { ...defaultState, ...parsed, lessons: parsed.lessons ?? {} };
  } catch {
    return defaultState;
  }
}

function write(state: ProgressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setHydrated(true);
    const sync = () => setState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    const next = fn(read());
    write(next);
    setState(next);
  }, []);

  const getLessonProgress = useCallback(
    (id: number): LessonProgress => state.lessons[String(id)] ?? emptyLessonProgress,
    [state],
  );

  const setWatched = useCallback(
    (id: number, watched: boolean) =>
      update((prev) => ({
        ...prev,
        lessons: {
          ...prev.lessons,
          [String(id)]: {
            ...(prev.lessons[String(id)] ?? emptyLessonProgress),
            watched,
          },
        },
      })),
    [update],
  );

  const saveQuizResult = useCallback(
    (id: number, correct: number, total: number) =>
      update((prev) => {
        const current = prev.lessons[String(id)] ?? emptyLessonProgress;
        const score = Math.round((correct / total) * 100);
        return {
          ...prev,
          lessons: {
            ...prev.lessons,
            [String(id)]: {
              ...current,
              attempts: current.attempts + 1,
              lastScore: score,
              bestScore: Math.max(current.bestScore ?? 0, score),
              lastAnswers: correct,
              lastTotal: total,
              correctAnswers: current.correctAnswers + correct,
            },
          },
        };
      }),
    [update],
  );

  const setSequentialMode = useCallback(
    (value: boolean) => update((prev) => ({ ...prev, sequentialMode: value })),
    [update],
  );

  const completeDaily = useCallback(
    () =>
      update((prev) => {
        const today = todayKey();
        if (prev.lastDailyDate === today) return { ...prev, dailyDone: true };
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = prev.lastDailyDate === yesterday ? prev.streak + 1 : 1;
        return { ...prev, lastDailyDate: today, streak, dailyDone: true };
      }),
    [update],
  );

  const reset = useCallback(() => {
    write(defaultState);
    setState(defaultState);
  }, []);

  return {
    state,
    hydrated,
    getLessonProgress,
    setWatched,
    saveQuizResult,
    setSequentialMode,
    completeDaily,
    reset,
  };
}

export type LessonStatus =
  | "not-started"
  | "in-progress"
  | "video-watched"
  | "quiz-passed"
  | "completed";

export const statusLabels: Record<LessonStatus, string> = {
  "not-started": "Не начат",
  "in-progress": "В процессе",
  "video-watched": "Видео просмотрено",
  "quiz-passed": "Тест пройден",
  completed: "Урок завершён",
};

export const PASS_SCORE = 70;

export function lessonStatus(p: LessonProgress): LessonStatus {
  const passed = (p.bestScore ?? 0) >= PASS_SCORE;
  if (p.watched && passed) return "completed";
  if (passed) return "quiz-passed";
  if (p.watched) return "video-watched";
  if (p.attempts > 0) return "in-progress";
  return "not-started";
}

export function isLessonUnlocked(
  lessonId: number,
  state: ProgressState,
): boolean {
  if (!state.sequentialMode || lessonId === 1) return true;
  const prev = state.lessons[String(lessonId - 1)] ?? emptyLessonProgress;
  return prev.watched && (prev.bestScore ?? 0) >= PASS_SCORE;
}
