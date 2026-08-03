import { Check, X } from "lucide-react";
import type { Question } from "@/data/types";
import { cn } from "@/lib/utils";

export type Answer = string | string[];

export const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/[’']/g, "'").replace(/[.,!?]/g, "").replace(/\s+/g, " ");

export function isAnswerCorrect(q: Question, answer: Answer | undefined): boolean {
  if (answer === undefined) return false;
  if (Array.isArray(q.correctAnswer)) {
    if (!Array.isArray(answer) || answer.length !== q.correctAnswer.length) return false;
    return q.correctAnswer.every((c, i) => normalize(c) === normalize(answer[i] ?? ""));
  }
  return typeof answer === "string" && normalize(answer) === normalize(q.correctAnswer);
}

export function QuizQuestion({
  question,
  index,
  answer,
  onChange,
  checked,
}: {
  question: Question;
  index: number;
  answer: Answer | undefined;
  onChange: (value: Answer) => void;
  checked: boolean;
}) {
  const correct = isAnswerCorrect(question, answer);

  return (
    <div
      className={cn(
        "rounded-3xl border p-4 transition-colors sm:p-5",
        checked
          ? correct
            ? "border-success/50 bg-success/8"
            : "border-destructive/50 bg-destructive/8"
          : "border-glass-border bg-glass",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-primary/12 text-xs font-bold text-primary">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{question.text}</p>

          {question.type === "single-choice" && question.options ? (
            <div className="mt-3 grid gap-2">
              {question.options.map((opt) => {
                const selected = answer === opt;
                const isRight = checked && normalize(opt) === normalize(question.correctAnswer as string);
                const isWrongPick = checked && selected && !isRight;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={checked}
                    onClick={() => onChange(opt)}
                    className={cn(
                      "press flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm transition-colors",
                      isRight
                        ? "border-success bg-success/15 font-semibold"
                        : isWrongPick
                          ? "border-destructive bg-destructive/15"
                          : selected
                            ? "border-primary bg-primary/12 font-semibold"
                            : "border-glass-border hover:border-primary/50 hover:bg-accent",
                    )}
                  >
                    <span>{opt}</span>
                    {isRight ? <Check className="h-4 w-4 shrink-0 text-success" /> : null}
                    {isWrongPick ? <X className="h-4 w-4 shrink-0 text-destructive" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {question.type === "fill-gap" ? (
            <input
              type="text"
              value={typeof answer === "string" ? answer : ""}
              disabled={checked}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Введите ответ"
              className="mt-3 w-full max-w-xs rounded-2xl border border-glass-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          ) : null}

          {question.type === "word-order" && question.options ? (
            <WordOrder
              words={question.options}
              answer={Array.isArray(answer) ? answer : []}
              onChange={onChange}
              disabled={checked}
            />
          ) : null}

          {question.type === "matching" && question.pairs ? (
            <div className="mt-3 grid gap-2">
              {question.pairs.map((pair, i) => {
                const options = Array.from(new Set(question.pairs!.map((p) => p.right)));
                const current = Array.isArray(answer) ? (answer[i] ?? "") : "";
                return (
                  <div key={pair.left} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                    <span className="truncate text-sm font-medium">{pair.left}</span>
                    <select
                      value={current}
                      disabled={checked}
                      onChange={(e) => {
                        const next = Array.isArray(answer) ? [...answer] : [];
                        while (next.length < question.pairs!.length) next.push("");
                        next[i] = e.target.value;
                        onChange(next);
                      }}
                      className="rounded-2xl border border-glass-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">— выберите —</option>
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          ) : null}

          {checked ? (
            <div className="mt-3 rounded-2xl bg-muted/60 p-3 text-sm">
              <p className={cn("font-semibold", correct ? "text-success" : "text-destructive")}>
                {correct ? "Верно" : "Неверно"}
                {!correct ? (
                  <span className="ml-1 font-normal text-foreground">
                    Правильный ответ:{" "}
                    {Array.isArray(question.correctAnswer)
                      ? question.correctAnswer.join(" ")
                      : question.correctAnswer}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-muted-foreground">{question.explanation}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WordOrder({
  words,
  answer,
  onChange,
  disabled,
}: {
  words: string[];
  answer: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
}) {
  const remaining = [...words];
  answer.forEach((w) => {
    const idx = remaining.indexOf(w);
    if (idx > -1) remaining.splice(idx, 1);
  });

  return (
    <div className="mt-3 space-y-2">
      <div className="min-h-11 rounded-2xl border border-dashed border-glass-border p-2">
        <div className="flex flex-wrap gap-2">
          {answer.length === 0 ? (
            <span className="px-2 py-1 text-xs text-muted-foreground">Нажимайте слова по порядку</span>
          ) : null}
          {answer.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange(answer.filter((_, j) => j !== i))}
              className="press rounded-xl bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary"
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((w, i) => (
          <button
            key={`${w}-pool-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange([...answer, w])}
            className="press rounded-xl border border-glass-border px-3 py-1.5 text-sm hover:border-primary/60 hover:bg-accent"
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
