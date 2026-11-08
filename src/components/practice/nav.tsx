import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Screen =
  | { id: "today" }
  | { id: "vocabulary" }
  | { id: "journal" }
  | { id: "timer" }
  | { id: "isolate" }
  | { id: "isolate-log"; practiceId: string }
  | { id: "integrate"; phraseId?: string }
  | { id: "improvise"; phraseId?: string }
  | { id: "practice"; practiceId: string }
  | { id: "continue"; sessionId: string }
  | { id: "timer-log"; durationSec: number }
  | { id: "routine"; routineId?: string };

type NavValue = {
  screen: Screen;
  push: (screen: Screen) => void;
  pop: () => void;
  tab: (screen: Screen) => void;
};

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ id: "today" }]);
  const screen = stack[stack.length - 1];
  useEffect(() => {
    document.querySelector("main")?.scrollTo(0, 0);
  }, [screen]);
  const value: NavValue = {
    screen,
    push: (next) => setStack((current) => [...current, next]),
    pop: () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)),
    tab: (next) => setStack([next]),
  };
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const value = useContext(NavContext);
  if (!value) throw new Error("Nav missing");
  return value;
}
