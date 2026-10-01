import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getLesson, lessons, type Lesson } from "@/data/lessons";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Quiz } from "@/components/Quiz";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/lessons/$lessonId")({
  loader: ({ params }): { lesson: Lesson } => {
    const lesson = getLesson(Number(params.lessonId));
    if (!lesson) throw notFound();
    return { lesson };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Урок не найден — English Step" }, { name: "robots", content: "noindex" }],
      };
    }
    const { lesson } = loaderData;
    return {
      meta: [
        { title: `Урок ${lesson.id}. ${lesson.shortTitle} — English Step` },
        { name: "description", content: lesson.description },
        { property: "og:title", content: `Урок ${lesson.id}. ${lesson.title}` },
        { property: "og:description", content: lesson.description },
      ],
    };
  },
  component: LessonPage,
});

function LessonPage() {
  const { lesson } = Route.useLoaderData() as { lesson: Lesson };
  const { getLessonProgress, setWatched, saveQuizResult } = useProgress();
  const p = getLessonProgress(lesson.id);
  const next = lessons.find((l) => l.id === lesson.id + 1);

  return (
    <article className="space-y-8">
      <header>
        <span className="text-sm font-bold text-primary">
          Урок {lesson.id} из {lessons.length}
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{lesson.title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{lesson.description}</p>
      </header>

      <VideoPlayer youtubeId={lesson.youtubeId} title={lesson.title} videoUrl={lesson.videoUrl} />

      <button
        type="button"
        onClick={() => setWatched(lesson.id, !p.watched)}
        className="press brand-gradient rounded-full px-5 py-3 text-sm font-bold text-primary-foreground"
      >
        {p.watched ? "Видео просмотрено ✓" : "Отметить видео как просмотренное"}
      </button>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass-panel rounded-3xl p-5">
          <h2 className="font-display text-lg font-bold">Основные правила</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {lesson.rules.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h2 className="font-display text-lg font-bold">Примеры</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {lesson.examples.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h2 className="font-display text-lg font-bold">Типичные ошибки</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {lesson.commonMistakes.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-3xl border border-primary/30 bg-primary/8 p-5">
        <h2 className="font-display text-lg font-bold">Перед тестом запомни</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {lesson.rules.slice(0, 4).map((r, i) => (
            <li key={r}>
              {i + 1}. {r}
            </li>
          ))}
        </ol>
      </section>

      <section id="quiz" className="scroll-mt-28 space-y-4">
        <h2 className="font-display text-2xl font-bold">Тест по теме урока</h2>
        <Quiz
          questions={lesson.questions}
          bestScore={p.bestScore}
          onComplete={(correct, total) => saveQuizResult(lesson.id, correct, total)}
        />
      </section>

      <nav className="flex flex-wrap gap-3">
        <Link
          to="/lessons"
          className="press rounded-full border border-glass-border bg-glass px-5 py-3 text-sm font-semibold hover:text-primary"
        >
          Все уроки
        </Link>
        {next ? (
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: String(next.id) }}
            className="press brand-gradient rounded-full px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Следующий урок: {next.shortTitle}
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
