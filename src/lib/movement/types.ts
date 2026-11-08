export type Origin = "seed" | "custom";

export type MediaKind = "image" | "video" | "link";

export type MediaItem = {
  id: string;
  kind: MediaKind;
  name: string;
  url?: string;
  mime?: string;
};

export type DraftMedia = MediaItem & {
  file?: Blob;
};

export type NoteEntry = {
  id: string;
  body: string;
  at: number;
};

export type EntryParent = "category" | "subcategory" | "practice" | "region";

export type Category = {
  id: string;
  name: string;
  blurb: string;
  summary: string;
  note: string;
  entries: NoteEntry[];
  origin: Origin;
};

export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  summary: string;
  entries: NoteEntry[];
  origin: Origin;
};

export type Practice = {
  id: string;
  categoryId: string;
  subcategoryId: string | null;
  name: string;
  summary: string;
  regionIds: string[];
  linkUrl: string | null;
  linkLabel: string | null;
  media: MediaItem[];
  entries: NoteEntry[];
  irradiation: number | null;
  origin: Origin;
};

export type Region = {
  id: string;
  name: string;
  summary: string;
  entries: NoteEntry[];
  origin: Origin;
};

export type Ownership = "exploring" | "patchy" | "connected" | "owned";

export type Limb = "bilateral" | "left" | "right";

export const LIMBS: { id: Limb; label: string; name: string }[] = [
  { id: "bilateral", label: "B", name: "Bilateral" },
  { id: "left", label: "L", name: "Left" },
  { id: "right", label: "R", name: "Right" },
];

export const ISOMETRIC_SECTION = "sub-isometrics";

export type IsometricPass = "both" | "pails" | "rails";

export const ISOMETRIC_PASSES: { id: IsometricPass; label: string }[] = [
  { id: "both", label: "Both" },
  { id: "pails", label: "PAILs" },
  { id: "rails", label: "RAILs" },
];

export type Session = {
  id: string;
  practiceId: string | null;
  name: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  regionIds: string[];
  regionNames: string[];
  side: Limb | null;
  isometric: IsometricPass | null;
  intention: string;
  notes: string;
  durationSec: number;
  ownership: Ownership | null;
  irradiation: number | null;
  media: MediaItem[];
  at: number;
};

export type TimerBlock = {
  label: string;
  seconds: number;
};

export type TimerPreset = {
  id: string;
  name: string;
  mode: "stopwatch" | "countdown" | "intervals";
  seconds: number;
  prepareSec: number;
  rounds: number;
  blocks: TimerBlock[];
  origin: Origin;
};

export type Phase = {
  label: string;
  seconds: number;
  round: number | null;
};

export type TimerStatus = "idle" | "running" | "paused" | "complete";

export type TimerState = {
  mode: TimerPreset["mode"];
  phases: Phase[];
  status: TimerStatus;
  phaseIndex: number;
  phaseBankMs: number;
  phaseSince: number | null;
  totalBankMs: number;
  totalSince: number | null;
  laps: number[];
  linkedPracticeId: string | null;
  startedAt: number | null;
  presetName: string;
};

export type Builder = {
  mode: TimerPreset["mode"];
  countdownMin: number;
  countdownSec: number;
  prepareSec: number;
  workSec: number;
  restSec: number;
  rounds: number;
  selectedPresetId: string | null;
};

export type Screen =
  | { id: "today" }
  | { id: "library" }
  | { id: "category"; categoryId: string }
  | { id: "practice"; practiceId: string }
  | {
      id: "practice-form";
      practiceId?: string;
      categoryId?: string;
      subcategoryId?: string | null;
    }
  | { id: "regions" }
  | { id: "region"; regionId: string }
  | { id: "timer" }
  | { id: "journal" }
  | { id: "session"; sessionId: string }
  | {
      id: "log";
      sessionId?: string;
      practiceId?: string;
      regionId?: string;
      durationSec?: number;
      at?: number;
    }
  | { id: "settings" }
  | { id: "favorites" };

export const OWNERSHIP: { id: Ownership; label: string; hint: string }[] = [
  { id: "exploring", label: "Exploring", hint: "New range, little control" },
  { id: "patchy", label: "Patchy", hint: "Some angles drop out" },
  { id: "connected", label: "Connected", hint: "Smooth, with attention" },
  { id: "owned", label: "Owned", hint: "Available on purpose" },
];
