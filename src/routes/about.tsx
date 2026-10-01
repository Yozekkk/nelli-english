import { createFileRoute, Link } from "@tanstack/react-router";
import { lessons, totalQuestions, PLAYLIST_URL } from "@/data/lessons";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О курсе — English Step (английский A2)" },
      {
        name: "description",
        content: "Как устроен курс «Английский язык за 20 уроков» уровня A2.",
      },
      { property: "og:title", content: "О курсе — English Step" },
      {
        property: "og:description",
        content: "20 видеоуроков, тесты с объяснениями и локальное сохранение прогресса.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">О курсе</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Пройди курс уровня A2, закрепи грамматику и проверь свои знания. Курс состоит из{" "}
          {lessons.length} видеоуроков и {totalQuestions} тренировочных вопросов с подробными
          объяснениями на русском языке.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Видеоуроки",
            text: "Каждый урок — короткое видео по одной грамматической теме и встроенный плеер прямо на сайте.",
          },
          {
            title: "Тесты с разбором",
            text: "Выбор ответа, вставка формы, поиск ошибки, порядок слов и сопоставление фраз. Ответы открываются только после проверки.",
          },
          {
            title: "Прогресс без регистрации",
            text: "Отметки о просмотре, результаты и серия дней хранятся локально в браузере.",
          },
        ].map((c) => (
          <section key={c.title} className="glass-card rounded-3xl p-5">
            <h2 className="font-display text-lg font-bold">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/lessons"
          className="press brand-gradient rounded-full px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Открыть все уроки
        </Link>
        <a
          href={PLAYLIST_URL}
          target="_blank"
          rel="noreferrer"
          className="press rounded-full border border-glass-border bg-glass px-6 py-3 text-sm font-semibold hover:text-primary"
        >
          Смотреть весь плейлист
        </a>
      </div>
    </div>
  );
}
