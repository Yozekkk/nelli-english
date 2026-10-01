import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export interface NavItem {
  to: string;
  label: string;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Главная" },
  { to: "/lessons", label: "Уроки" },
  { to: "/daily", label: "Ежедневные вопросы" },
  { to: "/progress", label: "Мой прогресс" },
  { to: "/about", label: "О курсе" },
];

export function MobileNavigation({
  open,
  onClose,
  progress,
}: {
  open: boolean;
  onClose: () => void;
  progress: number;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>("button, a");
    focusable?.[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && focusable?.length) {
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Закрыть меню"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/25 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "glass-panel fixed top-0 right-0 z-50 flex h-full w-[min(20rem,85vw)] flex-col gap-2 rounded-l-3xl p-6 transition-transform duration-400 ease-out md:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-bold gradient-text">English Step</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="press grid h-9 w-9 place-items-center rounded-full border border-glass-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {navItems.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "bg-primary/12 text-primary" }}
            className="rounded-2xl px-4 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {item.label}
          </Link>
        ))}
        <div className="mt-auto rounded-2xl border border-glass-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс курса</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="brand-gradient h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
