import { Link } from "@tanstack/react-router";
import { Youtube } from "lucide-react";
import { PLAYLIST_URL } from "@/data/lessons";
import { navItems } from "./MobileNavigation";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-glass-border py-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_auto_auto]">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold gradient-text">
            English Step — изучение английского языка шаг за шагом
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Бесплатный курс уровня A2: 20 видеоуроков, более 170 тренировочных вопросов и
            автоматическая синхронизация прогресса.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-start gap-3">
          <a
            href={PLAYLIST_URL}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-5 py-3 text-sm font-semibold transition-colors hover:text-primary"
          >
            <Youtube className="h-4 w-4" />
            Смотреть весь плейлист
          </a>
          <p className="text-xs text-muted-foreground">
            Прогресс синхронизируется между устройствами. Регистрация не нужна.
          </p>
        </div>
      </div>
    </footer>
  );
}
