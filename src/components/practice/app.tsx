import { Link } from "@tanstack/react-router";
import { BookOpen, Clock, House, Moon, NotebookPen, Sun } from "lucide-react";
import { useEffect } from "react";
import { JournalScreen } from "@/components/practice/journal";
import { NavProvider, useNav, type Screen } from "@/components/practice/nav";
import { TimerScreen } from "@/components/practice/timer";
import { TodayScreen } from "@/components/practice/today";
import { VocabularyScreen } from "@/components/practice/vocabulary";
import { RoutineScreen } from "@/components/practice/routines";
import { ContinueScreen, ImproviseScreen, IntegrateScreen, IsolateLogScreen, IsolateScreen, PracticeScreen, TimerLogScreen } from "@/components/practice/work";
import { cn } from "@/lib/cn";
import { usePractice } from "@/lib/practice/store";

const TABS: { id: Screen["id"]; label: string; icon: typeof BookOpen; screen: Screen }[] = [
  { id: "today", label: "Today", icon: House, screen: { id: "today" } },
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen, screen: { id: "vocabulary" } },
  { id: "journal", label: "Journal", icon: NotebookPen, screen: { id: "journal" } },
  { id: "timer", label: "Timer", icon: Clock, screen: { id: "timer" } },
];

export function PracticeApp() {
  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}

function Shell() {
  const { screen, tab } = useNav();
  const theme = usePractice((state) => state.theme);
  const setTheme = usePractice((state) => state.setTheme);
  useEffect(() => {
    document.documentElement.setAttribute("data-app", "practice");
    document.documentElement.setAttribute("data-theme", theme);
    document.title = "Movement Practice";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#4a453f" : "#fbfaf8");
  }, [theme]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="z-20 flex shrink-0 items-center justify-between bg-bg px-5 pt-5 pb-3 md:px-10">
        <div>
          <p className="display text-2xl">Movement Practice</p>
          <Link to="/movement" className="text-sm text-accent">
            Original Movement
          </Link>
        </div>
        <button
          type="button"
          aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex size-11 items-center justify-center"
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </header>
      <main className="flex-1 overflow-auto px-5 pb-32 md:px-10">
        <div className="mx-auto w-full max-w-2xl">
          <Body />
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const on = screen.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => tab(item.screen)}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs", on ? "text-ink" : "text-faint")}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Body() {
  const { screen } = useNav();
  switch (screen.id) {
    case "vocabulary":
      return <VocabularyScreen />;
    case "journal":
      return <JournalScreen />;
    case "timer":
      return <TimerScreen />;
    case "isolate":
      return <IsolateScreen />;
    case "isolate-log":
      return <IsolateLogScreen />;
    case "integrate":
      return <IntegrateScreen />;
    case "improvise":
      return <ImproviseScreen />;
    case "practice":
      return <PracticeScreen />;
    case "continue":
      return <ContinueScreen />;
    case "timer-log":
      return <TimerLogScreen />;
    case "routine":
      return <RoutineScreen key={screen.routineId ?? "new"} />;
    default:
      return <TodayScreen />;
  }
}
