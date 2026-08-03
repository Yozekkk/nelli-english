import { Link } from "@tanstack/react-router";
import { GraduationCap, Menu } from "lucide-react";
import { useState } from "react";
import { MobileNavigation, navItems } from "./MobileNavigation";
import { ThemeToggle } from "./ThemeToggle";
import { lessons } from "@/data/lessons";
import { lessonStatus, useProgress } from "@/lib/progress";

export function Header() {
  const [open, setOpen] = useState(false);
  const { state } = useProgress();

  const completed = lessons.filter(
    (l) => lessonStatus(state.lessons[String(l.id)] ?? { watched: false, attempts: 0, lastScore: null, bestScore: null, lastAnswers: null, lastTotal: null, correctAnswers: 0 }) === "completed",
  ).length;
  const progress = Math.round((completed / lessons.length) * 100);

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-40">
        <div className="glass-panel mx-auto mt-3 grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl px-4 py-3 sm:px-6 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="brand-gradient grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-primary-foreground shadow-[var(--shadow-glow)]">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-bold">English Step</span>
              <span className="hidden text-xs text-muted-foreground sm:block">английский за 20 уроков</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-primary/12 text-primary" }}
                className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-glass-border px-3 py-1.5 lg:flex">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div
                  className="brand-gradient h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums">{progress}%</span>
            </div>
            <ThemeToggle />
            <Link
              to="/progress"
              aria-label="Мой прогресс"
              className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-glass-border bg-glass text-sm font-bold text-primary"
            >
              A2
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Открыть меню"
              className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-glass-border bg-glass md:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>
      <MobileNavigation open={open} onClose={() => setOpen(false)} progress={progress} />
    </>
  );
}
