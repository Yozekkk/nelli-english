import type { Question } from "@/data/types";
import { isAnswerCorrect, type Answer } from "./QuizQuestion";
import { cn } from "@/lib/utils";

export function QuizResult({
  questions,
  answers,
  correct,
  bestScore,
}: {
  questions: Question[];
  answers: Record<string, Answer>;
  correct: number;
  bestScore?: number | null | undefined;
}) {
  const score = Math.round((correct / questions.length) * 100);

  return (
    <div className="animate-pop rounded-3xl border border-glass-border bg-glass p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-display text-2xl font-bold">Результат: {score}%</p>
        <p className="text-sm text-muted-foreground">
          Правильных ответов: {correct} из {questions.length}
        </p>
        {bestScore != null ? (
          <p className="text-sm text-muted-foreground">
            Лучший результат: {Math.max(bestScore, score)}%
          </p>
        ) : null}
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="brand-gradient h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const ok = isAnswerCorrect(q, answers[q.id]);
          return (
            <span
              key={q.id}
              title={ok ? "Верно" : "Ошибка"}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-xl text-xs font-bold",
                ok ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive",
              )}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {score >= 70
          ? "Отлично! Тема закреплена, можно двигаться к следующему уроку."
          : "Повтори правила урока и пройди тест ещё раз — для зачёта нужно 70%."}
      </p>
    </div>
  );
}
