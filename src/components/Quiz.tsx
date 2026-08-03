import { RotateCcw, Lightbulb, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { Question } from "@/data/types";
import { QuizQuestion, isAnswerCorrect, type Answer } from "./QuizQuestion";
import { QuizResult } from "./QuizResult";

export function Quiz({
  questions,
  bestScore,
  onComplete,
}: {
  questions: Question[];
  bestScore?: number | null;
  onComplete?: (correct: number, total: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [checked, setChecked] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);

  const correctCount = questions.filter((q) => isAnswerCorrect(q, answers[q.id])).length;

  const check = () => {
    setChecked(true);
    onComplete?.(correctCount, questions.length);
  };

  const restart = () => {
    setAnswers({});
    setChecked(false);
    setShowMistakes(false);
  };

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return Array.isArray(a) ? a.length > 0 : typeof a === "string" && a.trim() !== "";
  }).length;

  return (
    <div className="space-y-4">
      {!checked ? (
        <p className="text-sm text-muted-foreground">
          Отвечено {answeredCount} из {questions.length}. Правильные ответы появятся после проверки.
        </p>
      ) : null}

      <div className="grid gap-3">
        {questions.map((q, i) => (
          <QuizQuestion
            key={q.id}
            question={q}
            index={i}
            answer={answers[q.id]}
            checked={checked}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
          />
        ))}
      </div>

      {checked ? (
        <QuizResult
          questions={questions}
          answers={answers}
          correct={correctCount}
          bestScore={bestScore}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!checked ? (
          <button
            type="button"
            onClick={check}
            className="press brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Проверить ответы
          </button>
        ) : null}
        <button
          type="button"
          onClick={restart}
          className="press inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-5 py-3 text-sm font-semibold hover:text-primary"
        >
          <RotateCcw className="h-4 w-4" />
          Начать заново
        </button>
        {checked && correctCount < questions.length ? (
          <button
            type="button"
            onClick={() => setShowMistakes((v) => !v)}
            className="press inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-5 py-3 text-sm font-semibold hover:text-primary"
          >
            <Lightbulb className="h-4 w-4" />
            Объяснить ошибки
          </button>
        ) : null}
      </div>

      {checked && showMistakes ? (
        <div className="rounded-3xl border border-glass-border bg-glass p-4">
          <p className="font-display font-bold">Разбор ошибок</p>
          <ul className="mt-2 space-y-3 text-sm">
            {questions
              .filter((q) => !isAnswerCorrect(q, answers[q.id]))
              .map((q) => (
                <li key={q.id}>
                  <p className="font-semibold">{q.text}</p>
                  <p className="text-success">
                    Правильно:{" "}
                    {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(" ") : q.correctAnswer}
                  </p>
                  <p className="text-muted-foreground">{q.explanation}</p>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
