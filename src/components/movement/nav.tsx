import { createContext, useContext, type ReactNode } from "react";
import type { Screen } from "@/lib/movement/types";

type NavApi = {
  screen: Screen;
  push: (screen: Screen) => void;
  replace: (screen: Screen) => void;
  pop: () => void;
  go: (screen: Screen) => void;
};

const NavContext = createContext<NavApi | null>(null);

export function NavProvider({ value, children }: { value: NavApi; children: ReactNode }) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("Navigation is unavailable.");
  return nav;
}
