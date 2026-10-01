import { createFileRoute, Link } from "@tanstack/react-router";
import { lessons } from "@/data/lessons";
import { Reveal } from "@/components/Reveal";
import {
  emptyLessonProgress,
  isLessonUnlocked,
  lessonStatus,
  statusLabels,
  useProgress,
} from "@/lib/progress";

export const Route = createFileRoute("/lessons/")({
  head: () => ({
    meta: [
      { title: "Все 20 уроков — English Step" },
      {
        name: "description",
        content: "20 видеоуроков английского уровня A2 с тестами и объяснениями.",
      },
      { property: "og:title", content: "Все 20 уроков — English Step" },
      { property: "og:description", content: "Открой любой урок, посмотри видео и пройди тест." },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const { state, getLessonProgress, setWatched, setSequentialMode } = useProgress();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Уроки курса</h1>
          <p className="mt-2 text-muted-foreground">
            Смотри видео, отмечай просмотр и закрепляй тему тестом.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={state.sequentialMode}
            onChange={(e) => setSequentialMode(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Последовательное обучение
        </label>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson, i) => {
          const p = getLessonProgress(lesson.id);
          const status = lessonStatus(p);
          const unlocked = isLessonUnlocked(lesson.id, state);
          return (
            <Reveal key={lesson.id} delay={i * 20}>
              <article
                className={`glass-card flex h-full flex-col rounded-3xl p-5 ${unlocked ? "" : "opacity-60"}`}
                title={
                  unlocked
                    ? undefined
                    : "Откроется после просмотра предыдущего видео и 70% в его тесте"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-bold text-primary">
                    Урок {lesson.id}
                  </span>
                  <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
                </div>
                <h2 className="mt-3 font-display text-lg font-bold">{lesson.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{lesson.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Вопросов: {lesson.questions.length} · Последний результат:{" "}
                  {p.lastScore != null ? `${p.lastScore}%` : "—"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {unlocked ? (
                    <>
                      <Link
                        to="/lessons/$lessonId"
                        params={{ lessonId: String(lesson.id) }}
                        className="press brand-gradient rounded-full px-4 py-2.5 text-xs font-bold text-primary-foreground"
                      >
                        Смотреть урок
                      </Link>
                      <Link
                        to="/lessons/$lessonId"
                        params={{ lessonId: String(lesson.id) }}
                        hash="quiz"
                        className="press rounded-full border border-glass-border px-4 py-2.5 text-xs font-semibold hover:text-primary"
                      >
                        Пройти тест
                      </Link>
                      <button
                        type="button"
                        onClick={() => setWatched(lesson.id, !p.watched)}
                        className="press rounded-full border border-glass-border px-4 py-2.5 text-xs font-semibold hover:text-primary"
                      >
                        {p.watched ? "Просмотрено ✓" : "Отметить как просмотренный"}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Урок закрыт: завершите урок {lesson.id - 1} (видео + 70% в тесте).
                    </span>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
