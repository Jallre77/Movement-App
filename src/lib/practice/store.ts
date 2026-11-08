import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { seedDomains, seedPractices } from "@/lib/practice/seed";
import type { Domain, Phrase, Practice, Routine, Session, Stage } from "@/lib/practice/types";

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

type State = {
  domains: Domain[];
  practices: Practice[];
  phrases: Phrase[];
  routines: Routine[];
  sessions: Session[];
  theme: "light" | "dark";
  hiddenDomainIds: string[];
  setTheme: (theme: "light" | "dark") => void;
  addDomain: (name: string, blurb: string) => string;
  updateDomain: (id: string, name: string, blurb: string) => boolean;
  deleteDomain: (id: string) => void;
  addPractice: (domainId: string, name: string) => string;
  updatePractice: (id: string, name: string, domainId: string) => boolean;
  deletePractice: (id: string) => void;
  savePhrase: (name: string, practiceIds: string[], id?: string) => string;
  deletePhrase: (id: string) => void;
  saveRoutine: (name: string, practiceIds: string[], id?: string) => string;
  deleteRoutine: (id: string) => void;
  logSession: (session: Omit<Session, "id" | "at"> & { at?: number }) => void;
  updateSessionNotes: (id: string, notes: string) => void;
  extendSession: (id: string, addedSec: number, note: string) => void;
  deleteSession: (id: string) => void;
};

function mergeById<T extends { id: string }>(saved: T[] | undefined, seed: T[]) {
  const list = saved ?? [];
  const ids = new Set(list.map((item) => item.id));
  return [...list, ...seed.filter((item) => !ids.has(item.id))];
}

export function isolatedIds(sessions: Session[]) {
  return new Set(
    sessions.filter((session) => session.stage === "isolation").flatMap((session) => session.practiceIds),
  );
}

export function lastMeeting(sessions: Session[], practiceId: string) {
  return sessions
    .filter((session) => session.practiceIds.includes(practiceId) || session.appearedIds.includes(practiceId))
    .sort((a, b) => b.at - a.at)[0];
}

export const usePractice = create<State>()(
  persist(
    (set) => ({
      domains: seedDomains(),
      practices: seedPractices(),
      phrases: [],
      routines: [],
      sessions: [],
      theme: "light",
      hiddenDomainIds: [],
      setTheme: (theme) => set({ theme }),
      addDomain: (name, blurb) => {
        const trimmed = name.trim();
        if (!trimmed) return "";
        const domain: Domain = { id: uid("dom"), name: trimmed, blurb: blurb.trim() };
        set((state) => ({ domains: [...state.domains, domain] }));
        return domain.id;
      },
      updateDomain: (id, name, blurb) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        let found = false;
        set((state) => ({
          domains: state.domains.map((item) => {
            if (item.id !== id) return item;
            found = true;
            return { ...item, name: trimmed, blurb: blurb.trim() };
          }),
        }));
        return found;
      },
      deleteDomain: (id) =>
        set((state) => {
          if (state.domains.length <= 1) return {};
          const fallback = state.domains.find((item) => item.id !== id);
          if (!fallback) return {};
          return {
            domains: state.domains.filter((item) => item.id !== id),
            hiddenDomainIds: state.hiddenDomainIds.includes(id) ? state.hiddenDomainIds : [...state.hiddenDomainIds, id],
            practices: state.practices.map((item) => (item.domainId === id ? { ...item, domainId: fallback.id } : item)),
          };
        }),
      addPractice: (domainId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return "";
        const practice: Practice = { id: uid("prac"), domainId, name: trimmed, summary: "", origin: "custom" };
        set((state) => ({ practices: [...state.practices, practice] }));
        return practice.id;
      },
      updatePractice: (id, name, domainId) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        let found = false;
        set((state) => ({
          practices: state.practices.map((item) => {
            if (item.id !== id) return item;
            found = true;
            return { ...item, name: trimmed, domainId };
          }),
        }));
        return found;
      },
      deletePractice: (id) =>
        set((state) => ({
          practices: state.practices.filter((item) => item.id !== id || item.origin === "seed"),
          phrases: state.phrases
            .map((phrase) => ({ ...phrase, practiceIds: phrase.practiceIds.filter((item) => item !== id) }))
            .filter((phrase) => phrase.practiceIds.length >= 2),
          routines: state.routines.map((routine) => ({
            ...routine,
            practiceIds: routine.practiceIds.filter((item) => item !== id),
          })),
        })),
      savePhrase: (name, practiceIds, id) => {
        const nextId = id ?? uid("phrase");
        const phrase: Phrase = { id: nextId, name: name.trim() || "Untitled phrase", practiceIds, at: Date.now() };
        set((state) => ({
          phrases: state.phrases.some((item) => item.id === nextId)
            ? state.phrases.map((item) => (item.id === nextId ? phrase : item))
            : [phrase, ...state.phrases],
        }));
        return nextId;
      },
      deletePhrase: (id) => set((state) => ({ phrases: state.phrases.filter((item) => item.id !== id) })),
      saveRoutine: (name, practiceIds, id) => {
        const nextId = id ?? uid("routine");
        const routine: Routine = { id: nextId, name: name.trim() || "Untitled routine", practiceIds, at: Date.now() };
        set((state) => ({
          routines: state.routines.some((item) => item.id === nextId)
            ? state.routines.map((item) => (item.id === nextId ? routine : item))
            : [routine, ...state.routines],
        }));
        return nextId;
      },
      deleteRoutine: (id) => set((state) => ({ routines: state.routines.filter((item) => item.id !== id) })),
      logSession: (session) =>
        set((state) => ({
          sessions: [{ ...session, id: uid("ses"), at: session.at ?? Date.now() }, ...state.sessions],
        })),
      updateSessionNotes: (id, notes) =>
        set((state) => ({
          sessions: state.sessions.map((session) => (session.id === id ? { ...session, notes: notes.trim() } : session)),
        })),
      extendSession: (id, addedSec, note) =>
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== id) return session;
            const extra = note.trim();
            const notes = extra ? (session.notes ? `${session.notes}\n\n${extra}` : extra) : session.notes;
            return { ...session, durationSec: Math.min(24 * 60 * 60, session.durationSec + Math.max(0, addedSec)), notes };
          }),
        })),
      deleteSession: (id) => set((state) => ({ sessions: state.sessions.filter((item) => item.id !== id) })),
    }),
    {
      name: "movement-practice-v1",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<State>;
        const hidden = new Set(saved.hiddenDomainIds ?? []);
        return {
          ...current,
          ...saved,
          domains: mergeById(saved.domains, seedDomains()).filter((item) => !hidden.has(item.id)),
          hiddenDomainIds: saved.hiddenDomainIds ?? [],
          practices: mergeById(saved.practices, seedPractices()),
          phrases: saved.phrases ?? [],
          routines: saved.routines ?? [],
          sessions: saved.sessions ?? [],
        };
      },
    },
  ),
);

export function stageName(stage: Stage) {
  if (stage === "isolation") return "Isolation";
  if (stage === "integration") return "Integration";
  return "Improvisation";
}
