import { Link } from "@tanstack/react-router";
import { ArrowLeft, Library, Moon, NotebookPen, PersonStanding, SlidersHorizontal, Star, SunMedium, Timer } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FavoritesScreen } from "@/components/movement/favorites";
import { JournalScreen, SessionScreen } from "@/components/movement/journal";
import { CategoryScreen, LibraryScreen, PracticeFormScreen, PracticeScreen } from "@/components/movement/library";
import { LogScreen } from "@/components/movement/log-screen";
import { NavProvider, useNav } from "@/components/movement/nav";
import { RegionScreen, RegionsScreen } from "@/components/movement/regions";
import { SettingsScreen } from "@/components/movement/settings-screen";
import { TimerEngine } from "@/components/movement/timer-engine";
import { TimerScreen } from "@/components/movement/timer-screen";
import { TodayScreen } from "@/components/movement/today";
import { cn } from "@/lib/cn";
import { useMovement } from "@/lib/movement/store";
import { formatClock, phaseMs, totalMs } from "@/lib/movement/time";
import type { Screen } from "@/lib/movement/types";
import { useMovementReady } from "@/lib/movement/use-ready";

const TABS = [
  { id: "today", label: "Today", icon: SunMedium, screen: { id: "today" } },
  { id: "library", label: "Library", icon: Library, screen: { id: "library" } },
  { id: "regions", label: "Regions", icon: PersonStanding, screen: { id: "regions" } },
  { id: "timer", label: "Timer", icon: Timer, screen: { id: "timer" } },
  { id: "journal", label: "Journal", icon: NotebookPen, screen: { id: "journal" } },
] as const;

export function MovementApp() {
  const ready = useMovementReady();
  const theme = useMovement((state) => state.theme);
  const favoriteIds = useMovement((state) => state.favoriteIds);
  const [stack, setStack] = useState<Screen[]>([{ id: "today" }]);
  const screen = stack[stack.length - 1] ?? { id: "today" as const };
  const positions = useRef(new Map<string, number>());
  const navRef = useRef({ stack, restoring: false });
  if (navRef.current.stack !== stack) {
    const previous = navRef.current.stack;
    const restoring =
      previous.length === stack.length + 1 &&
      stack.every((item, index) => screenKey(previous[index]!) === screenKey(item));
    navRef.current = { stack, restoring };
  }
  const remember = () => {
    positions.current.set(screenKey(screen), window.scrollY);
  };
  const push = (next: Screen) => {
    remember();
    setStack((current) => [...current, next]);
  };
  const pop = () => {
    remember();
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  };
  const replace = (next: Screen) => {
    remember();
    setStack((current) => {
      const base = current.slice(0, -1);
      const previous = base[base.length - 1];
      if (previous && screenKey(previous) === screenKey(next)) return base.length > 0 ? base : [next];
      return base.length > 0 ? [...base, next] : [next];
    });
  };
  const go = (next: Screen) => {
    remember();
    setStack([next]);
  };
  const openTab = (next: Screen) => {
    remember();
    setStack((current) => {
      const top = current[current.length - 1];
      if (!top) return [next];
      if (screenKey(top) === screenKey(next)) return current;
      const section = rootTab(next);
      if (section && rootTab(top) === section) {
        let cut = current.length;
        while (cut > 0 && rootTab(current[cut - 1]!) === section) cut -= 1;
        const base = current.slice(0, cut);
        if (base.length === 0) return [next];
        const previous = base[base.length - 1];
        if (previous && screenKey(previous) === screenKey(next)) return base;
        return [...base, next];
      }
      return [...current, next];
    });
  };
  const opened = screenKey(screen);
  const notice = useMovement((state) => state.notice);

  useLayoutEffect(() => {
    if (!ready) return;
    const y = navRef.current.restoring ? (positions.current.get(opened) ?? 0) : 0;
    window.scrollTo(0, y);
    const id = window.requestAnimationFrame(() => window.scrollTo(0, y));
    return () => window.cancelAnimationFrame(id);
  }, [ready, opened]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => useMovement.getState().setNotice(null), 3400);
    return () => window.clearTimeout(id);
  }, [notice]);

  useLayoutEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-app", "movement");
    document.documentElement.setAttribute("data-theme", theme);
    document.title = "Movement";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#141210" : "#f3f1ed");
  }, [ready, theme]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-bg px-5 py-8 text-ink">
        <p className="display text-4xl">Movement</p>
        <p className="mt-4 text-muted">Opening your library…</p>
      </div>
    );
  }

  const active = rootTab(screen);
  const nested = stack.length > 1;
  const openFavorites = () => {
    if (screen.id === "favorites") return;
    push({ id: "favorites" });
  };

  return (
    <NavProvider value={{ screen, push, replace, pop, go }}>
      <TimerEngine />
      <div className="min-h-dvh bg-bg text-ink">
        <div className="mx-auto flex min-h-dvh max-w-6xl">
          <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
            <p className="display text-4xl">Movement</p>
            <p className="mt-1 text-sm text-muted">Somatic practice</p>
            <Link to="/" className="mt-3 text-sm text-accent">
              Movement Practice
            </Link>
            {nested ? (
              <button
                type="button"
                onClick={pop}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </button>
            ) : null}
            <nav className="mt-8 grid gap-1" aria-label="Primary">
              {TABS.map((tab) => (
                <TabButton key={tab.id} tab={tab} active={active === tab.id} onClick={() => openTab(tab.screen)} />
              ))}
            </nav>
            <div className="mt-auto grid gap-1">
              <button
                type="button"
                aria-current={screen.id === "favorites" ? "page" : undefined}
                onClick={() => openFavorites()}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-sm px-3 text-sm",
                  screen.id === "favorites" ? "bg-inverse text-inverse-fg" : "text-ink hover:bg-surface",
                )}
              >
                <Star className={cn("size-4", favoriteIds.length > 0 ? "fill-star text-star" : "text-current")} aria-hidden="true" />
                Favorites
              </button>
              <ThemeToggle labeled />
              <button
                type="button"
                onClick={() => push({ id: "settings" })}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-sm px-3 text-sm",
                  screen.id === "settings" ? "bg-inverse text-inverse-fg" : "text-ink hover:bg-surface",
                )}
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Settings
              </button>
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 bg-bg px-5 md:px-10">
              <div className={cn("flex items-center justify-between py-3", !nested && "md:hidden")}>
                {nested ? (
                  <button
                    type="button"
                    onClick={pop}
                    className="inline-flex h-11 items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                  </button>
                ) : (
                  <p className="display text-3xl">Movement</p>
                )}
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-label="Favorites"
                    aria-current={screen.id === "favorites" ? "page" : undefined}
                    onClick={() => openFavorites()}
                    className="inline-flex size-11 items-center justify-center md:hidden"
                  >
                    <Star className={cn("size-5", favoriteIds.length > 0 ? "fill-star text-star" : "text-current")} aria-hidden="true" />
                  </button>
                  <ThemeToggle />
                  {nested ? null : (
                    <button
                      type="button"
                      aria-label="Settings"
                      onClick={() => push({ id: "settings" })}
                      className="inline-flex size-11 items-center justify-center"
                    >
                      <SlidersHorizontal className="size-5" />
                    </button>
                  )}
                </div>
              </div>
              <Link to="/" className="block pb-3 text-sm text-accent md:hidden">
                Movement Practice
              </Link>
              {screen.id !== "timer" ? (
                <RunningChip onOpen={() => push({ id: "timer" })} hideDone={screen.id === "today"} />
              ) : null}
              {notice ? (
                <p role="status" className="pb-3 text-sm text-accent">
                  {notice}
                </p>
              ) : null}
            </header>
            <main key={screenKey(screen)} className="rise flex-1 px-5 pt-2 pb-28 md:px-10 md:pt-6 md:pb-16">
              <ScreenBody />
            </main>
          </div>
        </div>
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Primary"
        >
          <div className="grid grid-cols-5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const on = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => openTab(tab.screen)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                    on ? "text-ink" : "text-faint",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </NavProvider>
  );
}

function ScreenBody() {
  const { screen } = useNav();
  switch (screen.id) {
    case "today":
      return <TodayScreen />;
    case "library":
      return <LibraryScreen />;
    case "category":
      return <CategoryScreen />;
    case "practice":
      return <PracticeScreen />;
    case "practice-form":
      return <PracticeFormScreen />;
    case "regions":
      return <RegionsScreen />;
    case "region":
      return <RegionScreen />;
    case "timer":
      return <TimerScreen />;
    case "journal":
      return <JournalScreen />;
    case "session":
      return <SessionScreen />;
    case "log":
      return <LogScreen />;
    case "settings":
      return <SettingsScreen />;
    case "favorites":
      return <FavoritesScreen />;
    default:
      return <TodayScreen />;
  }
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-sm px-3 text-left text-sm",
        active ? "bg-inverse text-inverse-fg" : "text-ink hover:bg-surface",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {tab.label}
    </button>
  );
}

function ThemeToggle({ labeled = false }: { labeled?: boolean }) {
  const theme = useMovement((state) => state.theme);
  const setTheme = useMovement((state) => state.setTheme);
  const dark = theme === "dark";
  const Icon = dark ? SunMedium : Moon;
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-sm text-sm text-ink hover:bg-surface",
        labeled ? "px-3" : "size-11",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {labeled ? (dark ? "Light mode" : "Dark mode") : null}
    </button>
  );
}

function RunningChip({ onOpen, hideDone }: { onOpen: () => void; hideDone?: boolean }) {
  const timer = useMovement((state) => state.timer);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.status]);
  if (timer.status === "idle" || (hideDone && timer.status === "complete")) return null;
  const clock =
    timer.mode === "stopwatch"
      ? formatClock(totalMs(timer, now), "up")
      : formatClock(Math.max(0, (timer.phases[timer.phaseIndex]?.seconds ?? 0) * 1000 - phaseMs(timer, now)), "down");
  const label = timer.status === "paused" ? "Paused" : timer.status === "complete" ? "Done" : timer.presetName;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-3 flex h-11 w-full items-center justify-between rounded-sm border border-line bg-surface px-3 text-sm"
    >
      <span className="truncate">{label}</span>
      <span className="font-medium tabular-nums">{clock}</span>
    </button>
  );
}

function rootTab(screen: Screen) {
  switch (screen.id) {
    case "library":
    case "category":
    case "practice":
    case "practice-form":
      return "library";
    case "regions":
    case "region":
      return "regions";
    case "timer":
      return "timer";
    case "journal":
    case "session":
    case "log":
      return "journal";
    case "today":
      return "today";
    default:
      return null;
  }
}

function screenKey(screen: Screen) {
  switch (screen.id) {
    case "category":
      return `category-${screen.categoryId}`;
    case "practice":
      return `practice-${screen.practiceId}`;
    case "practice-form":
      return `form-${screen.practiceId ?? "new"}-${screen.categoryId ?? ""}-${String(screen.subcategoryId)}`;
    case "region":
      return `region-${screen.regionId}`;
    case "session":
      return `session-${screen.sessionId}`;
    case "log":
      return `log-${screen.sessionId ?? "new"}-${screen.practiceId ?? ""}-${screen.regionId ?? ""}-${screen.durationSec ?? ""}`;
    default:
      return screen.id;
  }
}
