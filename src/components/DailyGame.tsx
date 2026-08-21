import { useEffect, useMemo, useState } from "react";
import { Flame, CheckCircle2, ArrowRight, RotateCcw, Home, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Question } from "@/data/types";
import { QuizQuestion, isAnswerCorrect, type Answer } from "./QuizQuestion";
import { cn } from "@/lib/utils";

/* ---------------- cookie storage ---------------- */

const COOKIE = "english_step_daily_progress";

interface DailyCookie {
  /** дата последнего прохождения / текущей попытки (локальная) */
  d: string;
  /** номер текущего вопроса */
  i: number;
  /** правильных ответов */
  c: number;
  /** ответы текущей попытки */
  a: Record<string, Answer>;
  /** завершена ли сегодняшняя тренировка */
  f: boolean;
  /** серия дней */
  s: number;
  /** лучший результат, % */
  b: number;
  /** дата последнего завершённого дня */
  l: string | null;
}

const emptyCookie: DailyCookie = { d: "", i: 0, c: 0, a: {}, f: false, s: 0, b: 0, l: null };

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readCookie(): DailyCookie {
  if (typeof document === "undefined") return emptyCookie;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return emptyCookie;
  try {
    return { ...emptyCookie, ...(JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1))) as DailyCookie) };
  } catch {
    return emptyCookie;
  }
}

function writeCookie(value: DailyCookie) {
  if (typeof document === "undefined") return;
  const payload = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${COOKIE}=${payload}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/* ---------------- построение набора дня ---------------- */

function seeded(seed: number) {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(items: T[], count: number, rnd: () => number): T[] {
  const arr = [...items];
  const out: T[] = [];
  while (arr.length && out.length < count) {
    out.push(arr.splice(Math.floor(rnd() * arr.length), 1)[0]!);
  }
  return out;
}

const fill = (text: string, word: string) => text.replace("___", word);

/** True/False задание из вопроса с пропуском */
function toTrueFalse(q: Question, rnd: () => number): Question | null {
  if (!q.text.includes("___") || !q.options || typeof q.correctAnswer !== "string") return null;
  const wrong = q.options.filter((o) => o !== q.correctAnswer);
  const useCorrect = rnd() > 0.5;
  const word = useCorrect ? q.correctAnswer : (wrong[Math.floor(rnd() * wrong.length)] ?? q.correctAnswer);
  if (!useCorrect && word === q.correctAnswer) return null;
  return {
    id: `${q.id}-tf`,
    type: "single-choice",
    text: `Верно ли предложение? «${fill(q.text, word)}»`,
    options: ["✓ Correct", "✕ Incorrect"],
    correctAnswer: useCorrect ? "✓ Correct" : "✕ Incorrect",
    explanation: q.explanation,
  };
}

/** «Найди ошибку»: три верных предложения и одно с ошибкой */
function toFindError(pool: Question[], rnd: () => number): Question | null {
  const usable = pool.filter(
    (q) => q.text.includes("___") && q.options && typeof q.correctAnswer === "string",
  );
  const chosen = pick(usable, 4, rnd);
  if (chosen.length < 4) return null;
  const [bad, ...good] = chosen;
  const wrongOptions = bad!.options!.filter((o) => o !== bad!.correctAnswer);
  const wrongWord = wrongOptions[Math.floor(rnd() * wrongOptions.length)];
  if (!wrongWord) return null;
  const badSentence = fill(bad!.text, wrongWord);
  const options = pick(
    [badSentence, ...good.map((q) => fill(q.text, q.correctAnswer as string))],
    4,
    rnd,
  );
  return {
    id: `${bad!.id}-err`,
    type: "single-choice",
    text: "Какое предложение содержит ошибку?",
    options,
    correctAnswer: badSentence,
    explanation: bad!.explanation,
  };
}

export function buildDailySet(pool: Question[], dateKey: string): Question[] {
  const rnd = seeded(Number(dateKey.replace(/-/g, "")) || 1);
  const byType = (t: Question["type"]) => pool.filter((q) => q.type === t);

  const items: Question[] = [];
  const single = pick(byType("single-choice"), 8, rnd);

  // 1. выбор ответа
  if (single[0]) items.push(single[0]);
  // 2. найти ошибку
  const err = toFindError(pool, rnd);
  if (err) items.push(err);
  // 3. вставить слово
  const gap = pick(byType("fill-gap"), 1, rnd)[0];
  if (gap) items.push(gap);
  // 4. собрать предложение
  const order = pick(byType("word-order"), 1, rnd)[0];
  if (order) items.push(order);
  // 5. сопоставление
  const match = pick(byType("matching"), 1, rnd)[0];
  if (match) items.push(match);
  // 6. true / false
  for (const cand of single.slice(1)) {
    const tf = toTrueFalse(cand, rnd);
    if (tf) {
      items.push(tf);
      break;
    }
  }

  // дозаполняем до 6, если каких-то типов не хватило
  let i = 1;
  while (items.length < 6 && single[i]) {
    if (!items.some((it) => it.id === single[i]!.id)) items.push(single[i]!);
    i += 1;
  }
  return items.slice(0, 6);
}

/* ---------------- игра ---------------- */

export function DailyGame({
  pool,
  onFinish,
}: {
  pool: Question[];
  onFinish?: (correct: number, total: number) => void;
}) {
  const [dateKey] = useState(() => localDateKey());
  const questions = useMemo(() => buildDailySet(pool, dateKey), [pool, dateKey]);

  const [store, setStore] = useState<DailyCookie>(emptyCookie);
  const [hydrated, setHydrated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const raw = readCookie();
    const fresh =
      raw.d === dateKey ? raw : { ...raw, d: dateKey, i: 0, c: 0, a: {}, f: false };
    setStore(fresh);
    setHydrated(true);
  }, [dateKey]);

  const save = (next: DailyCookie) => {
    setStore(next);
    writeCookie(next);
  };

  const index = Math.min(store.i, questions.length - 1);
  const current = questions[index];
  const answer = current ? store.a[current.id] : undefined;
  const correctNow = current ? isAnswerCorrect(current, answer) : false;
  const answered =
    Array.isArray(answer) ? answer.length > 0 : typeof answer === "string" && answer.trim() !== "";

  const finish = (correct: number) => {
    const score = Math.round((correct / questions.length) * 100);
    const yesterday = localDateKey(new Date(Date.now() - 86400000));
    const alreadyToday = store.l === dateKey;
    const streak = alreadyToday ? store.s : store.l === yesterday ? store.s + 1 : 1;
    save({
      ...store,
      f: true,
      c: correct,
      i: questions.length,
      s: streak,
      b: Math.max(store.b, score),
      l: dateKey,
    });
    if (!alreadyToday) onFinish?.(correct, questions.length);
  };

  const check = () => {
    setChecked(true);
    save({ ...store, c: store.c + (correctNow ? 1 : 0) });
  };

  const next = () => {
    setChecked(false);
    if (index + 1 >= questions.length) {
      finish(store.c);
    } else {
      save({ ...store, i: index + 1 });
    }
  };

  const restart = () => {
    setChecked(false);
    save({ ...store, i: 0, c: 0, a: {}, f: false });
  };

  if (!hydrated) {
    return <div className="h-56 animate-pulse rounded-3xl border border-glass-border bg-glass" />;
  }

  const progress = store.f ? 100 : Math.round((index / questions.length) * 100);

  return (
    <div className="space-y-4">
      {/* прогресс + streak */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="brand-gradient h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {store.f ? "Тренировка завершена" : `Вопрос ${index + 1} из ${questions.length}`}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-3 py-1.5 text-sm font-bold">
          <Flame className="h-4 w-4 text-primary" />
          {store.s}
        </span>
      </div>

      {store.f || !current ? (
        <div className="animate-pop rounded-3xl border border-glass-border bg-glass p-5 sm:p-6">
          <p className="font-display text-2xl font-extrabold sm:text-3xl">
            Ежедневная тренировка завершена
          </p>
          <p className="mt-2 text-lg font-bold text-primary">
            {store.c} / {questions.length} правильных ·{" "}
            {Math.round((store.c / questions.length) * 100)}%
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Правильные ответы", `${store.c}`],
              ["Ошибки", `${questions.length - store.c}`],
              ["Серия дней", `🔥 ${store.s}`],
              ["Лучший результат", `${store.b}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-display text-lg font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/"
              className="press inline-flex items-center justify-center gap-2 rounded-full border border-glass-border bg-glass px-5 py-3 text-sm font-semibold hover:text-primary"
            >
              <Home className="h-4 w-4" />
              На главную
            </Link>
            <button
              type="button"
              onClick={restart}
              className="press brand-gradient inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <RotateCcw className="h-4 w-4" />
              Пройти ещё раз
            </button>
          </div>
        </div>
      ) : (
        <div key={current.id} className="animate-pop space-y-3">
          <QuizQuestion
            question={current}
            index={index}
            answer={answer}
            checked={checked}
            onChange={(value) =>
              save({ ...store, a: { ...store.a, [current.id]: value } })
            }
          />

          {checked ? (
            <div
              className={cn(
                "animate-pop rounded-3xl border p-4",
                correctNow
                  ? "border-success/50 bg-success/10"
                  : "border-destructive/50 bg-destructive/10",
              )}
            >
              <p
                className={cn(
                  "font-display text-lg font-bold",
                  correctNow ? "text-success" : "text-destructive",
                )}
              >
                {correctNow ? "Правильно!" : "Почти!"}
              </p>
              <button
                type="button"
                onClick={next}
                className="press brand-gradient mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] sm:w-auto"
              >
                {index + 1 >= questions.length ? "Показать результат" : "Продолжить"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!answered}
              onClick={check}
              className="press brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" />
              Проверить
            </button>
          )}
        </div>
      )}

      {!store.f ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Прогресс тренировки сохраняется в браузере — можно продолжить позже.
        </p>
      ) : null}
    </div>
  );
}
