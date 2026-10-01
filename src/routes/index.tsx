import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, PlayCircle, Youtube } from "lucide-react";
import { lessons, totalQuestions, PLAYLIST_URL } from "@/data/lessons";
import { Reveal } from "@/components/Reveal";
import { ProgressRing } from "@/components/ProgressRing";
import { lessonStatus, useProgress, emptyLessonProgress } from "@/lib/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "English Step — английский за 20 уроков (уровень A2)" },
      {
        name: "description",
        content:
          "Бесплатный курс английского уровня A2: 20 видеоуроков, тесты с объяснениями и сохранение прогресса.",
      },
      { property: "og:title", content: "English Step — английский за 20 уроков (уровень A2)" },
      {
        property: "og:description",
        content:
          "Бесплатный курс английского уровня A2: 20 видеоуроков, тесты с объяснениями и сохранение прогресса.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { state } = useProgress();
  const completed = lessons.filter(
    (l) => lessonStatus(state.lessons[String(l.id)] ?? emptyLessonProgress) === "completed",
  ).length;
  const percent = Math.round((completed / lessons.length) * 100);
  const best = Math.max(0, ...lessons.map((l) => state.lessons[String(l.id)]?.bestScore ?? 0));

  return (
    <div className="space-y-16">
      <section className="gradient-surface relative overflow-hidden rounded-4xl px-5 py-14 sm:px-10 sm:py-20">
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_auto] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-1.5 text-xs font-semibold">
              Уровень A2 · {lessons.length} уроков · {totalQuestions}+ вопросов
            </span>
            <h1 className="mt-5 font-display text-4xl leading-tight font-extrabold sm:text-5xl">
              Английский язык <span className="gradient-text">за 20 уроков</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Последовательно изучай грамматику уровня A2, смотри видеоуроки, отвечай на вопросы и
              отслеживай свой прогресс.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/lessons/$lessonId"
                params={{ lessonId: "1" }}
                className="press brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                <PlayCircle className="h-4 w-4" /> Начать обучение
              </Link>
              <Link
                to="/lessons"
                className="press inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-6 py-3 text-sm font-semibold hover:text-primary"
              >
                <BookOpen className="h-4 w-4" /> Открыть все уроки
              </Link>
              <a
                href={PLAYLIST_URL}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-6 py-3 text-sm font-semibold hover:text-primary"
              >
                <Youtube className="h-4 w-4" /> Смотреть весь плейлист
              </a>
            </div>
          </div>
          <div className="glass-panel rounded-4xl p-6">
            <ProgressRing value={percent} sublabel="курс пройден" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-glass-border p-3">
                <div className="font-display text-xl font-bold">{completed}</div>
                <div className="text-xs text-muted-foreground">уроков завершено</div>
              </div>
              <div className="rounded-2xl border border-glass-border p-3">
                <div className="font-display text-xl font-bold">{best}%</div>
                <div className="text-xs text-muted-foreground">лучший результат</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Дорожная карта обучения</h2>
        <p className="mt-2 text-muted-foreground">
          От Present Simple до фразовых глаголов — двадцать шагов уровня A2.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {lessons.map((lesson, i) => {
            const status = lessonStatus(state.lessons[String(lesson.id)] ?? emptyLessonProgress);
            return (
              <Reveal key={lesson.id} delay={i * 25}>
                <Link
                  to="/lessons/$lessonId"
                  params={{ lessonId: String(lesson.id) }}
                  className="glass-card block h-full rounded-3xl p-4"
                >
                  <span className="text-xs font-bold text-primary">Урок {lesson.id}</span>
                  <p className="mt-1 font-semibold">{lesson.shortTitle}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {status === "completed"
                      ? "Урок завершён"
                      : status === "not-started"
                        ? "Не начат"
                        : "В процессе"}
                  </p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>
    </div>
  );
}
