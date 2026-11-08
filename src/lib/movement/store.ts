import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { beep, unlockAudio } from "@/lib/movement/audio";
import { blobsFor, clearAllBlobs } from "@/lib/movement/media";
import { seedData } from "@/lib/movement/seed";
import {
  addLap,
  applyPreset,
  beginFromBuilder,
  builderToPreset,
  catchUp,
  defaultBuilder,
  idleTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  skipPhase,
  stopTimer,
  uid,
} from "@/lib/movement/time";
import type {
  Builder,
  Category,
  EntryParent,
  NoteEntry,
  Practice,
  Region,
  Session,
  Subcategory,
  TimerPreset,
  TimerState,
} from "@/lib/movement/types";
import { ISOMETRIC_SECTION } from "@/lib/movement/types";

type Data = {
  categories: Category[];
  subcategories: Subcategory[];
  practices: Practice[];
  regions: Region[];
  sessions: Session[];
  presets: TimerPreset[];
  timer: TimerState;
  builder: Builder;
  sound: boolean;
  theme: "light" | "dark";
  favoriteIds: string[];
  notice: string | null;
};

type Actions = {
  setNotice: (notice: string | null) => void;
  setSound: (sound: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  setBuilder: (patch: Partial<Builder>) => void;
  selectPreset: (id: string) => void;
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  startTimer: () => void;
  pause: () => void;
  reset: () => void;
  stop: () => void;
  lap: () => void;
  skip: () => void;
  tick: (now: number) => void;
  armPractice: (practiceId: string) => boolean;
  clearLink: () => void;
  addCategory: (name: string, blurb: string) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (categoryId: string, name: string, summary: string) => void;
  updateSubcategory: (sub: Subcategory) => void;
  deleteSubcategory: (id: string) => void;
  savePractice: (practice: Practice) => void;
  movePractice: (id: string, direction: "up" | "down") => void;
  placePractice: (id: string, index: number) => void;
  setIrradiation: (practiceId: string, value: number) => void;
  deletePractice: (id: string) => void;
  toggleFavorite: (practiceId: string) => void;
  addRegion: (name: string, summary: string) => void;
  updateRegion: (region: Region) => void;
  deleteRegion: (id: string) => void;
  addEntry: (parent: EntryParent, id: string, body: string) => boolean;
  updateEntry: (parent: EntryParent, id: string, entryId: string, body: string) => boolean;
  deleteEntry: (parent: EntryParent, id: string, entryId: string) => void;
  saveSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  clearSessions: () => void;
  restoreSeeds: () => void;
  resetAll: () => void;
};

export type MovementState = Data & Actions;

const seed = seedData();

const initial: Data = {
  ...seed,
  timer: idleTimer(),
  builder: defaultBuilder(),
  sound: true,
  theme: "light",
  favoriteIds: [],
  notice: null,
};

function missingById<T extends { id: string }>(current: T[], incoming: T[]) {
  const ids = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !ids.has(item.id))];
}

function inSeedOrder<T extends { id: string }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const item of incoming) {
    ordered.push(byId.get(item.id) ?? item);
    seen.add(item.id);
  }
  for (const item of current) {
    if (!seen.has(item.id)) ordered.push(item);
  }
  return ordered;
}

const RETIRED_ISOMETRIC = new Set(["sub-pails", "sub-rails"]);

const RETIRED_CATEGORIES = new Set(["cat-external", "cat-flow"]);

function withoutRetired(
  categories: Category[],
  subcategories: Subcategory[],
  practices: Practice[],
  favoriteIds: string[],
) {
  const nextCategories = categories.filter((item) => !RETIRED_CATEGORIES.has(item.id));
  const nextSubs = subcategories.filter((item) => !RETIRED_CATEGORIES.has(item.categoryId));
  const nextPractices = practices.filter((item) => !RETIRED_CATEGORIES.has(item.categoryId));
  const ids = new Set(nextPractices.map((item) => item.id));
  return {
    categories: nextCategories,
    subcategories: nextSubs,
    practices: nextPractices,
    favoriteIds: favoriteIds.filter((id) => ids.has(id)),
  };
}

function combineIsometricSections(subcategories: Subcategory[], practices: Practice[], sessions: Session[]) {
  const retired = subcategories.filter((item) => RETIRED_ISOMETRIC.has(item.id));
  const keptNotes = retired.flatMap((item) => item.entries ?? []);
  const seedCombined = seed.subcategories.find((item) => item.id === ISOMETRIC_SECTION);
  let next = subcategories.filter((item) => !RETIRED_ISOMETRIC.has(item.id));
  if (seedCombined) {
    const current = next.find((item) => item.id === ISOMETRIC_SECTION);
    if (current) {
      const seen = new Set((current.entries ?? []).map((entry) => entry.id));
      next = next.map((item) =>
        item.id === ISOMETRIC_SECTION
          ? { ...item, entries: [...(item.entries ?? []), ...keptNotes.filter((entry) => !seen.has(entry.id))] }
          : item,
      );
    } else {
      next = [...next, { ...seedCombined, entries: keptNotes }];
    }
  }
  const name = seedCombined?.name ?? "PAILs / RAILs";
  return {
    subcategories: inSeedOrder(next, seed.subcategories),
    practices: practices.map((item) =>
      item.subcategoryId && RETIRED_ISOMETRIC.has(item.subcategoryId)
        ? { ...item, subcategoryId: ISOMETRIC_SECTION }
        : item,
    ),
    sessions: sessions.map((item) =>
      item.subcategoryId && RETIRED_ISOMETRIC.has(item.subcategoryId)
        ? { ...item, subcategoryId: ISOMETRIC_SECTION, subcategoryName: name }
        : item,
    ),
  };
}

const FOLDED_ISOMETRIC: Record<string, string> = {
  "prac-hip-rail": "prac-hip-pail",
  "prac-sh-rail": "prac-sh-pail",
};

function foldIsometricPractices(practices: Practice[], sessions: Session[], favoriteIds: string[]) {
  const byId = new Map(practices.map((item) => [item.id, item]));
  for (const [from, to] of Object.entries(FOLDED_ISOMETRIC)) {
    const dropped = byId.get(from);
    const kept = byId.get(to);
    if (dropped && kept) {
      const seen = new Set((kept.entries ?? []).map((entry) => entry.id));
      byId.set(to, {
        ...kept,
        entries: [...(kept.entries ?? []), ...(dropped.entries ?? []).filter((entry) => !seen.has(entry.id))],
      });
    } else if (dropped) {
      byId.set(to, { ...dropped, id: to });
    }
    byId.delete(from);
  }
  const next = [...byId.values()].map((item) => {
    const fresh = seed.practices.find((practice) => practice.id === item.id);
    if (!fresh || !/ (PAIL|RAIL)$/.test(item.name)) return item;
    return { ...item, name: fresh.name, summary: fresh.summary };
  });
  const mapId = (id: string | null) => (id && FOLDED_ISOMETRIC[id] ? FOLDED_ISOMETRIC[id] : id);
  return {
    practices: next,
    sessions: sessions.map((item) => ({ ...item, practiceId: mapId(item.practiceId) })),
    favoriteIds: [...new Set(favoriteIds.map((id) => FOLDED_ISOMETRIC[id] ?? id))],
  };
}

function mapEntries(
  entries: NoteEntry[] | undefined,
  entryId: string,
  body: string,
): NoteEntry[] | null {
  const list = entries ?? [];
  if (!list.some((item) => item.id === entryId)) return null;
  return list.map((item) => (item.id === entryId ? { ...item, body, at: Date.now() } : item));
}

export const useMovement = create<MovementState>()(
  persist(
    (set, get) => ({
      ...initial,
      setNotice: (notice) => set({ notice }),
      setSound: (sound) => set({ sound }),
      setTheme: (theme) => set({ theme }),
      setBuilder: (patch) =>
        set((state) => ({
          builder: { ...state.builder, ...patch, selectedPresetId: patch.selectedPresetId ?? null },
        })),
      selectPreset: (id) => {
        const preset = get().presets.find((item) => item.id === id);
        if (!preset) return;
        set({ builder: applyPreset(preset, get().builder) });
      },
      savePreset: (name) => {
        const trimmed = name.trim();
        if (!trimmed) {
          set({ notice: "Name the preset first." });
          return;
        }
        const id = uid("pre");
        const preset = builderToPreset(get().builder, id, trimmed, "custom");
        set((state) => ({
          presets: [...state.presets, preset],
          builder: { ...state.builder, selectedPresetId: id },
          notice: "Preset saved on this device.",
        }));
      },
      deletePreset: (id) =>
        set((state) => {
          const preset = state.presets.find((item) => item.id === id);
          if (!preset || preset.origin === "seed") return { notice: "Starter presets stay." };
          return {
            presets: state.presets.filter((item) => item.id !== id),
            builder:
              state.builder.selectedPresetId === id
                ? { ...state.builder, selectedPresetId: null }
                : state.builder,
            notice: "Preset removed.",
          };
        }),
      startTimer: () => {
        const now = Date.now();
        const state = get();
        if (state.sound) unlockAudio();
        if (state.timer.status === "running") return;
        if (state.timer.status === "paused") {
          set({ timer: resumeTimer(state.timer, now) });
          return;
        }
        const result = beginFromBuilder(state.builder, state.presets, state.timer.linkedPracticeId, now);
        if ("error" in result) {
          set({ notice: result.error });
          return;
        }
        set({ timer: result.timer, notice: null });
      },
      pause: () => set({ timer: pauseTimer(get().timer, Date.now()) }),
      reset: () => set({ timer: resetTimer(get().timer) }),
      stop: () => set({ timer: stopTimer(get().timer, Date.now()) }),
      lap: () => set({ timer: addLap(get().timer, Date.now()) }),
      skip: () => {
        const prev = get().timer;
        const timer = skipPhase(prev, Date.now());
        if (timer === prev) return;
        set({ timer });
        if (!get().sound) return;
        beep(timer.status === "complete" ? "done" : "phase");
      },
      tick: (now) => {
        const { timer, cue } = catchUp(get().timer, now);
        if (timer === get().timer) return;
        set({ timer });
        if (cue && get().sound) beep(cue);
      },
      armPractice: (practiceId) => {
        const state = get();
        if (!state.practices.some((item) => item.id === practiceId)) return false;
        if (state.timer.status === "running" || state.timer.status === "paused") {
          set({ notice: "A timer is already going. Log or reset it before arming another practice." });
          return false;
        }
        set({ timer: { ...state.timer, linkedPracticeId: practiceId }, notice: null });
        return true;
      },
      clearLink: () => set((state) => ({ timer: { ...state.timer, linkedPracticeId: null } })),
      addCategory: (name, blurb) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const category: Category = {
          id: uid("cat"),
          name: trimmed,
          blurb: blurb.trim() || "A category you added.",
          summary: blurb.trim() || "A category you added.",
          note: "",
          entries: [],
          origin: "custom",
        };
        set((state) => ({ categories: [...state.categories, category], notice: "Category added." }));
      },
      updateCategory: (category) =>
        set((state) => ({
          categories: state.categories.map((item) => (item.id === category.id ? category : item)),
          notice: "Category saved.",
        })),
      deleteCategory: (id) => {
        const state = get();
        const category = state.categories.find((item) => item.id === id);
        if (!category) return;
        const doomed = state.practices.filter((item) => item.categoryId === id);
        for (const practice of doomed) blobsFor(practice.media);
        const doomedIds = new Set(doomed.map((item) => item.id));
        set({
          categories: state.categories.filter((item) => item.id !== id),
          subcategories: state.subcategories.filter((item) => item.categoryId !== id),
          practices: state.practices.filter((item) => item.categoryId !== id),
          timer: doomedIds.has(state.timer.linkedPracticeId ?? "")
            ? { ...state.timer, linkedPracticeId: null }
            : state.timer,
          notice: "Category removed.",
        });
      },
      addSubcategory: (categoryId, name, summary) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const sub: Subcategory = {
          id: uid("sub"),
          categoryId,
          name: trimmed,
          summary: summary.trim(),
          entries: [],
          origin: "custom",
        };
        set((state) => ({ subcategories: [...state.subcategories, sub], notice: "Subcategory added." }));
      },
      updateSubcategory: (sub) =>
        set((state) => ({
          subcategories: state.subcategories.map((item) => (item.id === sub.id ? sub : item)),
          notice: "Section saved.",
        })),
      deleteSubcategory: (id) =>
        set((state) => ({
          subcategories: state.subcategories.filter((item) => item.id !== id),
          practices: state.practices.map((item) =>
            item.subcategoryId === id ? { ...item, subcategoryId: null } : item,
          ),
          notice: "Subcategory removed. Its practices are now unsorted.",
        })),
      savePractice: (practice) =>
        set((state) => {
          const exists = state.practices.some((item) => item.id === practice.id);
          return {
            practices: exists
              ? state.practices.map((item) => (item.id === practice.id ? practice : item))
              : [...state.practices, practice],
            notice: exists ? "Practice updated." : "Practice added.",
          };
        }),
      movePractice: (id, direction) =>
        set((state) => {
          const current = state.practices.find((item) => item.id === id);
          if (!current) return state;
          const group = state.practices.filter(
            (item) => item.categoryId === current.categoryId && item.subcategoryId === current.subcategoryId,
          );
          const index = group.findIndex((item) => item.id === id);
          const swapWith = group[direction === "up" ? index - 1 : index + 1];
          if (!swapWith) return state;
          const next = [...state.practices];
          const from = next.findIndex((item) => item.id === id);
          const to = next.findIndex((item) => item.id === swapWith.id);
          next[from] = swapWith;
          next[to] = current;
          return { practices: next };
        }),
      placePractice: (id, index) =>
        set((state) => {
          const current = state.practices.find((item) => item.id === id);
          if (!current) return state;
          const group = state.practices.filter(
            (item) => item.categoryId === current.categoryId && item.subcategoryId === current.subcategoryId,
          );
          const from = group.findIndex((item) => item.id === id);
          const to = Math.max(0, Math.min(index, group.length - 1));
          if (from < 0 || from === to) return state;
          const reordered = [...group];
          const [moved] = reordered.splice(from, 1);
          reordered.splice(to, 0, moved);
          const ids = new Set(group.map((item) => item.id));
          let cursor = 0;
          return {
            practices: state.practices.map((item) => (ids.has(item.id) ? reordered[cursor++] : item)),
          };
        }),
      setIrradiation: (practiceId, value) => {
        const next = Math.round(value);
        if (next < 1 || next > 10) return;
        set((state) => ({
          practices: state.practices.map((item) =>
            item.id === practiceId ? { ...item, irradiation: next } : item,
          ),
        }));
      },
      deletePractice: (id) => {
        const practice = get().practices.find((item) => item.id === id);
        if (practice) blobsFor(practice.media);
        set((state) => ({
          practices: state.practices.filter((item) => item.id !== id),
          favoriteIds: state.favoriteIds.filter((item) => item !== id),
          timer:
            state.timer.linkedPracticeId === id
              ? { ...state.timer, linkedPracticeId: null }
              : state.timer,
          notice: "Practice removed.",
        }));
      },
      toggleFavorite: (practiceId) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(practiceId)
            ? state.favoriteIds.filter((id) => id !== practiceId)
            : [...state.favoriteIds, practiceId],
        })),
      addRegion: (name, summary) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const region: Region = {
          id: uid("reg"),
          name: trimmed,
          summary: summary.trim() || "A region you added.",
          entries: [],
          origin: "custom",
        };
        set((state) => ({ regions: [...state.regions, region], notice: "Region added." }));
      },
      updateRegion: (region) =>
        set((state) => ({
          regions: state.regions.map((item) => (item.id === region.id ? region : item)),
          notice: "Region saved.",
        })),
      deleteRegion: (id) =>
        set((state) => {
          if (!state.regions.some((item) => item.id === id)) return {};
          return {
            regions: state.regions.filter((item) => item.id !== id),
            practices: state.practices.map((item) => ({
              ...item,
              regionIds: item.regionIds.filter((regionId) => regionId !== id),
            })),
            notice: "Region removed.",
          };
        }),
      saveSession: (session) =>
        set((state) => {
          const exists = state.sessions.some((item) => item.id === session.id);
          const sessions = exists
            ? state.sessions.map((item) => (item.id === session.id ? session : item))
            : [session, ...state.sessions];
          return { sessions, notice: exists ? "Session updated." : "Session saved on this device." };
        }),
      deleteSession: (id) => {
        const session = get().sessions.find((item) => item.id === id);
        if (session) blobsFor(session.media);
        set((state) => ({
          sessions: state.sessions.filter((item) => item.id !== id),
          notice: "Session deleted.",
        }));
      },
      clearSessions: () => {
        for (const session of get().sessions) blobsFor(session.media);
        set({ sessions: [], notice: "Journal cleared. The library is unchanged." });
      },
      restoreSeeds: () =>
        set((state) => {
          const fresh = seedData();
          return {
            categories: missingById(state.categories, fresh.categories),
            subcategories: missingById(state.subcategories, fresh.subcategories),
            practices: missingById(state.practices, fresh.practices),
            regions: missingById(state.regions, fresh.regions),
            presets: missingById(state.presets, fresh.presets),
            notice: "Missing starter items are back. Edits you kept were left alone.",
          };
        }),
      resetAll: () => {
        void clearAllBlobs();
        const fresh = seedData();
        set({
          ...fresh,
          timer: idleTimer(),
          builder: defaultBuilder(),
          sound: get().sound,
          theme: get().theme,
          favoriteIds: [],
          notice: "Movement was reset on this device.",
        });
      },
      addEntry: (parent, id, body) => {
        const trimmed = body.trim();
        if (!trimmed) {
          set({ notice: "Write something before saving." });
          return false;
        }
        const entry: NoteEntry = { id: uid("note"), body: trimmed, at: Date.now() };
        const state = get();
        if (parent === "category") {
          if (!state.categories.some((item) => item.id === id)) return false;
          set({
            categories: state.categories.map((item) =>
              item.id === id ? { ...item, entries: [entry, ...(item.entries ?? [])] } : item,
            ),
            notice: "Note saved.",
          });
          return true;
        }
        if (parent === "subcategory") {
          if (!state.subcategories.some((item) => item.id === id)) return false;
          set({
            subcategories: state.subcategories.map((item) =>
              item.id === id ? { ...item, entries: [entry, ...(item.entries ?? [])] } : item,
            ),
            notice: "Note saved.",
          });
          return true;
        }
        if (parent === "practice") {
          if (!state.practices.some((item) => item.id === id)) return false;
          set({
            practices: state.practices.map((item) =>
              item.id === id ? { ...item, entries: [entry, ...(item.entries ?? [])] } : item,
            ),
            notice: "Note saved.",
          });
          return true;
        }
        if (!state.regions.some((item) => item.id === id)) return false;
        set({
          regions: state.regions.map((item) =>
            item.id === id ? { ...item, entries: [entry, ...(item.entries ?? [])] } : item,
          ),
          notice: "Note saved.",
        });
        return true;
      },
      updateEntry: (parent, id, entryId, body) => {
        const trimmed = body.trim();
        if (!trimmed) {
          set({ notice: "A note needs text." });
          return false;
        }
        const state = get();
        if (parent === "category") {
          const category = state.categories.find((item) => item.id === id);
          const entries = mapEntries(category?.entries, entryId, trimmed);
          if (!entries) return false;
          set({
            categories: state.categories.map((item) => (item.id === id ? { ...item, entries } : item)),
            notice: "Note updated.",
          });
          return true;
        }
        if (parent === "subcategory") {
          const sub = state.subcategories.find((item) => item.id === id);
          const entries = mapEntries(sub?.entries, entryId, trimmed);
          if (!entries) return false;
          set({
            subcategories: state.subcategories.map((item) => (item.id === id ? { ...item, entries } : item)),
            notice: "Note updated.",
          });
          return true;
        }
        if (parent === "practice") {
          const practice = state.practices.find((item) => item.id === id);
          const entries = mapEntries(practice?.entries, entryId, trimmed);
          if (!entries) return false;
          set({
            practices: state.practices.map((item) => (item.id === id ? { ...item, entries } : item)),
            notice: "Note updated.",
          });
          return true;
        }
        const region = state.regions.find((item) => item.id === id);
        const entries = mapEntries(region?.entries, entryId, trimmed);
        if (!entries) return false;
        set({
          regions: state.regions.map((item) => (item.id === id ? { ...item, entries } : item)),
          notice: "Note updated.",
        });
        return true;
      },
      deleteEntry: (parent, id, entryId) => {
        const state = get();
        const drop = (entries: NoteEntry[] | undefined) => (entries ?? []).filter((item) => item.id !== entryId);
        if (parent === "category") {
          set({
            categories: state.categories.map((item) =>
              item.id === id ? { ...item, entries: drop(item.entries) } : item,
            ),
            notice: "Note deleted.",
          });
          return;
        }
        if (parent === "subcategory") {
          set({
            subcategories: state.subcategories.map((item) =>
              item.id === id ? { ...item, entries: drop(item.entries) } : item,
            ),
            notice: "Note deleted.",
          });
          return;
        }
        if (parent === "practice") {
          set({
            practices: state.practices.map((item) =>
              item.id === id ? { ...item, entries: drop(item.entries) } : item,
            ),
            notice: "Note deleted.",
          });
          return;
        }
        set({
          regions: state.regions.map((item) => (item.id === id ? { ...item, entries: drop(item.entries) } : item)),
          notice: "Note deleted.",
        });
      },
    }),
    {
      name: "movement-v1",
      skipHydration: true,
      storage: createJSONStorage(() => ({
        getItem: (name) => (typeof window === "undefined" ? null : localStorage.getItem(name)),
        setItem: (name, value) => {
          if (typeof window !== "undefined") localStorage.setItem(name, value);
        },
        removeItem: (name) => {
          if (typeof window !== "undefined") localStorage.removeItem(name);
        },
      })),
      partialize: (state) => ({
        categories: state.categories,
        subcategories: state.subcategories,
        practices: state.practices,
        regions: state.regions,
        sessions: state.sessions,
        presets: state.presets,
        timer: state.timer,
        builder: state.builder,
        sound: state.sound,
        theme: state.theme,
        favoriteIds: state.favoriteIds,
      }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<Data>;
        const practices = stored.practices ?? current.practices;
        const all = seed.practices.find((item) => item.id === "prac-all-cars");
        const withAll =
          all && !practices.some((item) => item.id === all.id) ? [all, ...practices] : practices;
        const nextPractices = withAll.map((item) => {
          if (item.id !== "prac-all-cars" || item.regionIds.includes("reg-hand")) return item;
          const wrist = item.regionIds.indexOf("reg-wrist");
          const regionIds = [...item.regionIds];
          regionIds.splice(wrist >= 0 ? wrist + 1 : regionIds.length, 0, "reg-hand");
          return { ...item, regionIds };
        });
        const regions = inSeedOrder(stored.regions ?? current.regions, seed.regions);
        const rawFavorites = stored.favoriteIds;
        const favoriteIds = Array.isArray(rawFavorites)
          ? rawFavorites.filter((id): id is string => typeof id === "string")
          : [];
        const combined = combineIsometricSections(
          stored.subcategories ?? current.subcategories,
          nextPractices,
          stored.sessions ?? current.sessions,
        );
        const folded = foldIsometricPractices(combined.practices, combined.sessions, favoriteIds);
        const storedTimer = stored.timer ?? current.timer;
        const linked = storedTimer.linkedPracticeId;
        const timer =
          linked && FOLDED_ISOMETRIC[linked]
            ? { ...storedTimer, linkedPracticeId: FOLDED_ISOMETRIC[linked] }
            : storedTimer;
        const cleaned = withoutRetired(
          stored.categories ?? current.categories,
          combined.subcategories,
          folded.practices,
          folded.favoriteIds,
        );
        return {
          ...current,
          ...stored,
          practices: cleaned.practices,
          categories: cleaned.categories,
          subcategories: cleaned.subcategories,
          sessions: folded.sessions,
          regions,
          favoriteIds: cleaned.favoriteIds,
          timer,
          notice: null,
        };
      },
    },
  ),
);


