export type Stage = "isolation" | "integration" | "improvisation";

export type Origin = "seed" | "custom";

export type Domain = {
  id: string;
  name: string;
  blurb: string;
};

export type Practice = {
  id: string;
  domainId: string;
  name: string;
  summary: string;
  origin: Origin;
};

export type Phrase = {
  id: string;
  name: string;
  practiceIds: string[];
  at: number;
};

export type Routine = {
  id: string;
  name: string;
  practiceIds: string[];
  at: number;
};

export type Session = {
  id: string;
  at: number;
  stage: Stage;
  practiceIds: string[];
  phraseId: string | null;
  appearedIds: string[];
  notes: string;
  durationSec: number;
};

export const STAGES: { id: Stage; name: string; line: string }[] = [
  { id: "isolation", name: "Isolation", line: "One unit, attended alone." },
  { id: "integration", name: "Integration", line: "A fixed order, until it is one action." },
  { id: "improvisation", name: "Improvisation", line: "The same set, order free." },
];
