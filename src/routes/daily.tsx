import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { lessons } from "@/data/lessons";
import { Quiz } from "@/components/Quiz";
import { DailyGame } from "@/components/DailyGame";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Ежедневные вопросы — English Step" },
      { name: "description", content: "Короткие тесты по 20 темам уровня A2 и режим «Вопросы дня»." },
      { property: "og:title", content: "Ежедневные вопросы — English Step" },
      { property: "og:description", content: "Закрепляй темы небольшими тестами каждый день." },
    ],
  }),
  component: DailyPage,
});

function DailyPage() {
  const { getLessonProgress, saveQuizResult, completeDaily } = useProgress();
  const [open, setOpen] = useState<number[]>([]);

  const pool = lessons.flatMap((l) => l.questions);


  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Ежедневные вопросы</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Закрепляй изученные темы небольшими тестами. Открывай урок, отвечай на вопросы и получай
          мгновенный результат.
        </p>
      </header>

      <section className="glass-panel rounded-3xl p-4 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="min-w-0 font-display text-xl font-bold">Вопросы дня</h2>
          <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
            6 заданий · один вопрос за раз
          </span>
        </div>
        <div className="mt-4">
          <DailyGame pool={pool} onFinish={() => completeDaily()} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Тесты по урокам</h2>
        {lessons.map((lesson) => {
          const isOpen = open.includes(lesson.id);
          const p = getLessonProgress(lesson.id);
          return (
            <div key={lesson.id} className="glass-panel overflow-hidden rounded-3xl">
              <button
                type="button"
                onClick={() =>
                  setOpen((prev) =>
                    prev.includes(lesson.id) ? prev.filter((i) => i !== lesson.id) : [...prev, lesson.id],
                  )
                }
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">
                    Урок {lesson.id} — {lesson.shortTitle}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Вопросов: {lesson.questions.length}
                    {p.bestScore != null ? ` · лучший результат: ${p.bestScore}%` : ""}
                  </span>
                </span>
                <span className="text-lg text-primary">{isOpen ? "−" : "+"}</span>
              </button>
              <div
                className="grid transition-all duration-500 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="space-y-4 border-t border-glass-border px-5 py-5">
                    <div>
                      <p className="font-display font-bold">Краткое правило</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {lesson.rules.slice(0, 3).map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                      <p className="mt-3 font-display font-bold">Примеры</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {lesson.examples.slice(0, 3).map((e) => (
                          <li key={e}>• {e}</li>
                        ))}
                      </ul>
                    </div>
                    {isOpen ? (
                      <Quiz
                        questions={lesson.questions}
                        bestScore={p.bestScore}
                        onComplete={(c, t) => saveQuizResult(lesson.id, c, t)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
