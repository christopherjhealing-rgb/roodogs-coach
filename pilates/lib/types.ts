// Core data model for Bloom Pilates.
// All dates are ISO strings (YYYY-MM-DD for calendar days), all timestamps ISO.

export type Discipline = "mat" | "reformer" | "barre";

export type Level = "beginner" | "intermediate" | "advanced";

export type FocusArea =
  | "core"
  | "glutes"
  | "legs"
  | "arms"
  | "back"
  | "shoulders"
  | "spine-mobility"
  | "hips"
  | "balance"
  | "full-body"
  | "stretch"
  | "breath";

export type Equipment =
  | "none"
  | "mat"
  | "reformer"
  | "barre"
  | "ball"
  | "band"
  | "ring"
  | "weights"
  | "foam-roller"
  | "box"
  | "jumpboard"
  | "block";

export interface Movement {
  /** Seed movements use readable ids like "seed-mat-hundred"; instructor-created ones are uuids. */
  id: string;
  /** null = shared seed library (read-only). Otherwise the instructor who owns it. */
  ownerId: string | null;
  name: string;
  discipline: Discipline;
  level: Level;
  focus: FocusArea[];
  equipment: Equipment[];
  /** Setup and how the movement is performed. Plain text, may contain newlines. */
  description: string;
  /** Short teaching cues an instructor says out loud. */
  cues: string[];
  /** Regressions and progressions. */
  modifications: string[];
  /** Cautions, e.g. "Avoid with acute lower-back pain". Keep positive and practical. */
  contraindications: string[];
  /** Reformer only: suggested spring load, e.g. "1 red + 1 blue". */
  springs?: string;
  /** Typical time spent on the movement in a class, in seconds. */
  defaultDurationSec?: number;
  /** Typical rep prescription, e.g. "8–10 each side". */
  defaultReps?: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanItem {
  id: string;
  movementId: string;
  durationSec: number;
  reps?: string;
  notes?: string;
}

export interface PlanSection {
  id: string;
  name: string;
  items: PlanItem[];
}

export interface LessonPlan {
  id: string;
  ownerId: string;
  name: string;
  discipline: Discipline;
  level: Level;
  targetMinutes: number;
  sections: PlanSection[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** A class the instructor taught, logged on the calendar. */
export interface ClassLog {
  id: string;
  ownerId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, optional */
  time?: string;
  planId: string | null;
  title: string;
  discipline: Discipline;
  location?: string;
  attendees?: number;
  notes: string;
  createdAt: string;
}

export const DISCIPLINES: { id: Discipline; label: string }[] = [
  { id: "mat", label: "Mat" },
  { id: "reformer", label: "Reformer" },
  { id: "barre", label: "Barre" },
];

export const LEVELS: { id: Level; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export const FOCUS_AREAS: { id: FocusArea; label: string }[] = [
  { id: "core", label: "Core" },
  { id: "glutes", label: "Glutes" },
  { id: "legs", label: "Legs" },
  { id: "arms", label: "Arms" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "spine-mobility", label: "Spine mobility" },
  { id: "hips", label: "Hips" },
  { id: "balance", label: "Balance" },
  { id: "full-body", label: "Full body" },
  { id: "stretch", label: "Stretch" },
  { id: "breath", label: "Breath" },
];

export const EQUIPMENT: { id: Equipment; label: string }[] = [
  { id: "none", label: "No equipment" },
  { id: "mat", label: "Mat" },
  { id: "reformer", label: "Reformer" },
  { id: "barre", label: "Barre" },
  { id: "ball", label: "Small ball" },
  { id: "band", label: "Resistance band" },
  { id: "ring", label: "Pilates ring" },
  { id: "weights", label: "Light weights" },
  { id: "foam-roller", label: "Foam roller" },
  { id: "box", label: "Box" },
  { id: "jumpboard", label: "Jumpboard" },
  { id: "block", label: "Block" },
];

export function labelFor<T extends string>(
  list: { id: T; label: string }[],
  id: T,
): string {
  return list.find((x) => x.id === id)?.label ?? id;
}
