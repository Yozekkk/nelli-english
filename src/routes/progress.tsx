import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { lessons, totalQuestions } from "@/data/lessons";
import { ProgressRing } from "@/components/ProgressRing";
import { emptyLessonProgress, lessonStatus, statusLabels, useProgress } from "@/lib/progress";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Мой прогресс — English Step" },
      { name: "description", content: "Статистика прохождения курса английского уровня A2." },
      { property: "og:title", content: "Мой прогресс — English Step" },
      { property: "og:description", content: "Завершённые уроки, средний и лучший результат, серия дней." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { state, reset } = useProgress();
  const [confirm, setConfirm] = useState(false);

  const items = lessons.map((l) => state.lessons[String(l.id)] ?? emptyLessonProgress);
  const completed = items.filter((p) => lessonStatus(p) === "completed").length;
  const watched = items.filter((p) => p.watched).length;
  const attempted = items.filter((p) => p.attempts > 0).length;
  const scores = items.map((p) => p.lastScore).filter((s): s is number => s != null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const best = Math.max(0, ...items.map((p) => p.bestScore ?? 0));
  const correct = items.reduce((sum, p) => sum + p.correctAnswers, 0);
  const percent = Math.round((completed / lessons.length) * 100);

  const stats = [
    { label: "Завершённые уроки", value: `${completed} / ${lessons.length}` },
    { label: "Просмотренные видео", value: `${watched}` },
    { label: "Пройденные тесты", value: `${attempted}` },
    { label: "Средний результат", value: `${average}%` },
    { label: "Лучший результат", value: `${best}%` },
    { label: "Правильных ответов", value: `${correct} из ${totalQuestions}+` },
    { label: "Серия дней", value: `${state.streak}` },
    { label: "Курс пройден", value: `${percent}%` },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Мой прогресс</h1>
        <p className="mt-2 text-muted-foreground">Данные сохраняются локально в браузере.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="glass-panel grid place-items-center rounded-3xl p-6">
          <ProgressRing value={percent} sublabel="общий прогресс" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-3xl p-4">
              <div className="font-display text-2xl font-bold">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="glass-panel rounded-3xl p-5">
        <h2 className="font-display text-xl font-bold">Статусы уроков</h2>
        <ul className="mt-3 divide-y divide-glass-border">
          {lessons.map((l, i) => (
            <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2.5 text-sm">
              <span className="truncate">
                {l.id}. {l.shortTitle}
              </span>
              <span className="shrink-0 text-muted-foreground">{statusLabels[lessonStatus(items[i]!)]}</span>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="press rounded-full border border-destructive/50 px-5 py-3 text-sm font-semibold text-destructive"
        >
          Сбросить прогресс
        </button>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6">
            <h3 className="font-display text-lg font-bold">Сбросить весь прогресс?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Будут удалены все результаты тестов, отметки о просмотре и серия дней.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setConfirm(false);
                }}
                className="press rounded-full bg-destructive px-5 py-2.5 text-sm font-bold text-destructive-foreground"
              >
                Да, сбросить
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="press rounded-full border border-glass-border px-5 py-2.5 text-sm font-semibold"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
