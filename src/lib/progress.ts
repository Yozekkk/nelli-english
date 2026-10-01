import { useCallback, useSyncExternalStore } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { localDateKey, previousLocalDateKey } from "./date";

export interface LessonProgress {
  watched: boolean;
  attempts: number;
  lastScore: number | null;
  bestScore: number | null;
  lastAnswers: number | null;
  lastTotal: number | null;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  sequentialMode: boolean;
  streak: number;
  lastDailyDate: string | null;
  dailyDone: boolean;
  totalCorrectAnswers: number;
}

type Operation =
  | { id: string; epoch: string | null; kind: "watched"; lessonId: number; watched: boolean }
  | {
      id: string;
      epoch: string | null;
      kind: "quiz";
      lessonId: number;
      correct: number;
      total: number;
    }
  | { id: string; epoch: string | null; kind: "sequential"; value: boolean }
  | { id: string; epoch: string | null; kind: "daily"; today: string }
  | { id: string; epoch: string | null; kind: "reset" };
type NewOperation =
  | { kind: "watched"; lessonId: number; watched: boolean }
  | { kind: "quiz"; lessonId: number; correct: number; total: number }
  | { kind: "sequential"; value: boolean }
  | { kind: "daily"; today: string }
  | { kind: "reset" };

type SyncStatus = "syncing" | "saved" | "offline";
type Snapshot = {
  state: ProgressState;
  hydrated: boolean;
  syncStatus: SyncStatus;
  generation: string | null;
};
type RemoteSnapshot = {
  learner: {
    epoch: string;
    sequential_mode: boolean;
    streak: number;
    last_daily_date: string | null;
    total_correct_answers: number;
  };
  lessons: Array<{
    lesson_id: number;
    watched: boolean;
    attempts: number;
    last_score: number | null;
    best_score: number | null;
    last_answers: number | null;
    last_total: number | null;
  }>;
};

const STORAGE_KEY = "english-step-progress-v1";
const PENDING_KEY = "english-step-progress-pending-v1";
const LEGACY_BACKUP_KEY = "english-step-progress-legacy-backup-v1";
const listeners = new Set<() => void>();

export const emptyLessonProgress: LessonProgress = {
  watched: false,
  attempts: 0,
  lastScore: null,
  bestScore: null,
  lastAnswers: null,
  lastTotal: null,
};
export const defaultState: ProgressState = {
  lessons: {},
  sequentialMode: false,
  streak: 0,
  lastDailyDate: null,
  dailyDone: false,
  totalCorrectAnswers: 0,
};

let base = defaultState;
let epoch: string | null = null;
let pending: Operation[] = [];
let snapshot: Snapshot = {
  state: defaultState,
  hydrated: false,
  syncStatus: "syncing",
  generation: null,
};
const serverSnapshot: Snapshot = {
  state: defaultState,
  hydrated: false,
  syncStatus: "syncing",
  generation: null,
};
let started = false;
let working = false;
let supabase: SupabaseClient | null = null;
let nextReadId = 0;
let appliedReadId = 0;

function getClient() {
  if (supabase) return supabase;
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase publishable configuration is missing");
  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return supabase;
}

export function todayKey(): string {
  return localDateKey();
}

function yesterdayKey(today: string): string {
  return previousLocalDateKey(new Date(`${today}T12:00:00`));
}

function apply(state: ProgressState, op: Operation): ProgressState {
  if (op.kind === "reset") return defaultState;
  if (op.kind === "sequential") return { ...state, sequentialMode: op.value };
  if (op.kind === "daily") {
    return {
      ...state,
      dailyDone: true,
      lastDailyDate: op.today,
      streak:
        state.lastDailyDate === op.today
          ? state.streak
          : state.lastDailyDate === yesterdayKey(op.today)
            ? state.streak + 1
            : 1,
    };
  }
  const key = String(op.lessonId);
  const current = state.lessons[key] ?? emptyLessonProgress;
  const next =
    op.kind === "watched"
      ? { ...current, watched: op.watched }
      : {
          ...current,
          attempts: current.attempts + 1,
          lastScore: Math.round((op.correct / op.total) * 100),
          bestScore: Math.max(current.bestScore ?? 0, Math.round((op.correct / op.total) * 100)),
          lastAnswers: op.correct,
          lastTotal: op.total,
        };
  return {
    ...state,
    lessons: { ...state.lessons, [key]: next },
    totalCorrectAnswers: state.totalCorrectAnswers + (op.kind === "quiz" ? op.correct : 0),
  };
}

function publish(status: SyncStatus) {
  const state = pending.reduce(apply, base);
  snapshot = { state, hydrated: true, syncStatus: status, generation: epoch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, remoteEpoch: epoch }));
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Storage can be disabled; remote progress remains authoritative.
  }
  listeners.forEach((listener) => listener());
}

function readLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const cached = JSON.parse(raw ?? "null");
    if (cached && typeof cached.remoteEpoch === "string") {
      epoch = cached.remoteEpoch;
      base = {
        ...defaultState,
        ...cached,
        lessons: cached.lessons ?? {},
      };
    } else if (cached?.lessons && raw) {
      // Preserve the exact old JSON for recovery. Use it as a fallback only;
      // the seeded Supabase record remains canonical when available.
      if (!window.localStorage.getItem(LEGACY_BACKUP_KEY)) {
        window.localStorage.setItem(LEGACY_BACKUP_KEY, raw);
      }
      const legacyLessons = cached.lessons as Record<string, { correctAnswers?: number }>;
      const correct = Object.values(legacyLessons).reduce(
        (sum, lesson) => sum + (lesson.correctAnswers ?? 0),
        0,
      );
      base = { ...defaultState, ...cached, lessons: cached.lessons, totalCorrectAnswers: correct };
    }
    const queued = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? "[]");
    pending = Array.isArray(queued) ? queued : [];
  } catch {
    base = defaultState;
    pending = [];
  }
}

function fromRemote(data: RemoteSnapshot): ProgressState {
  const lessons: Record<string, LessonProgress> = {};
  for (const row of data.lessons) {
    lessons[String(row.lesson_id)] = {
      watched: row.watched,
      attempts: row.attempts,
      lastScore: row.last_score,
      bestScore: row.best_score,
      lastAnswers: row.last_answers,
      lastTotal: row.last_total,
    };
  }
  return {
    lessons,
    sequentialMode: data.learner.sequential_mode,
    streak: data.learner.streak,
    lastDailyDate: data.learner.last_daily_date,
    dailyDone: data.learner.last_daily_date === todayKey(),
    totalCorrectAnswers: data.learner.total_correct_answers,
  };
}

async function fetchRemote(silent = false) {
  const readId = ++nextReadId;
  const { data, error } = await getClient().rpc("get_progress_snapshot");
  if (readId < appliedReadId) return;
  if (error) throw error;
  if (!data?.learner || !Array.isArray(data.lessons))
    throw new Error("Progress snapshot is missing");
  appliedReadId = readId;
  const remote = data as RemoteSnapshot;
  epoch = remote.learner.epoch;
  base = fromRemote(remote);
  if (!silent) publish(pending.length ? "syncing" : "saved");
}

async function refresh() {
  if (working) return;
  try {
    await fetchRemote();
    void flush();
  } catch {
    publish("offline");
  }
}

async function flush() {
  if (working || !pending.length || !epoch) return;
  working = true;
  try {
    while (pending.length) {
      const op = pending[0]!;
      const args = {
        p_operation_id: op.id,
        p_expected_epoch: op.epoch ?? epoch,
        p_kind: op.kind,
        p_lesson_id: "lessonId" in op ? op.lessonId : null,
        p_watched: op.kind === "watched" ? op.watched : null,
        p_correct: op.kind === "quiz" ? op.correct : null,
        p_total: op.kind === "quiz" ? op.total : null,
        p_sequential_mode: op.kind === "sequential" ? op.value : null,
        p_today: op.kind === "daily" ? op.today : null,
      };
      const { error } = await getClient().rpc("apply_progress_operation", args);
      if (error) {
        if (error.message.includes("Progress was reset")) {
          pending.shift();
          await fetchRemote();
          continue;
        }
        throw error;
      }
      await fetchRemote(true);
      pending.shift();
      publish(pending.length ? "syncing" : "saved");
    }
    publish("saved");
  } catch {
    publish("offline");
  } finally {
    working = false;
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  readLocal();
  publish("syncing");
  void refresh();
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);
  window.addEventListener("storage", refresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}
function getServerSnapshot(): Snapshot {
  return serverSnapshot;
}

function enqueue(input: NewOperation) {
  start();
  const afterReset = pending.some((item) => item.kind === "reset");
  pending.push({
    ...input,
    id: crypto.randomUUID(),
    epoch: afterReset ? null : epoch,
  } as Operation);
  publish("syncing");
  if (epoch) void flush();
  else void refresh();
}

export function useProgress() {
  const { state, hydrated, syncStatus, generation } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const getLessonProgress = useCallback(
    (id: number): LessonProgress => state.lessons[String(id)] ?? emptyLessonProgress,
    [state],
  );
  return {
    state,
    hydrated,
    syncStatus,
    generation,
    getLessonProgress,
    setWatched: (id: number, watched: boolean) =>
      enqueue({ kind: "watched", lessonId: id, watched }),
    saveQuizResult: (id: number, correct: number, total: number) =>
      enqueue({ kind: "quiz", lessonId: id, correct, total }),
    setSequentialMode: (value: boolean) => enqueue({ kind: "sequential", value }),
    completeDaily: () => enqueue({ kind: "daily", today: todayKey() }),
    reset: () => {
      document.cookie = "english_step_daily_progress=; path=/; max-age=0; samesite=lax";
      window.localStorage.removeItem("english-step-daily-generation-v1");
      enqueue({ kind: "reset" });
    },
  };
}

export type LessonStatus =
  "not-started" | "in-progress" | "video-watched" | "quiz-passed" | "completed";
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
export function isLessonUnlocked(lessonId: number, state: ProgressState): boolean {
  if (!state.sequentialMode || lessonId === 1) return true;
  const prev = state.lessons[String(lessonId - 1)] ?? emptyLessonProgress;
  return prev.watched && (prev.bestScore ?? 0) >= PASS_SCORE;
}
