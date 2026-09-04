import type { LessonPlan, Movement, PlanItem, PlanSection } from "./types";
import { newId } from "./id";

/** Total planned time across every section, in seconds. */
export function planSeconds(plan: Pick<LessonPlan, "sections">): number {
  return plan.sections.reduce((sum, s) => sum + sectionSeconds(s), 0);
}

export function sectionSeconds(section: PlanSection): number {
  return section.items.reduce((sum, i) => sum + (i.durationSec || 0), 0);
}

export function planMovementCount(plan: Pick<LessonPlan, "sections">): number {
  return plan.sections.reduce((n, s) => n + s.items.length, 0);
}

/** "45 min", "1 hr 05", "30 sec". */
export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} sec`;
  const mins = Math.round(sec / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${String(m).padStart(2, "0")}`;
}

/** Short "m:ss" form used inside the builder. */
export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const DEFAULT_SECTIONS = ["Warm-up", "Main", "Cool-down"] as const;

export function newSection(name: string): PlanSection {
  return { id: newId(), name, items: [] };
}

export function newPlan(ownerId: string, overrides: Partial<LessonPlan> = {}): LessonPlan {
  const now = new Date().toISOString();
  return {
    id: newId(),
    ownerId,
    name: "",
    discipline: "mat",
    level: "beginner",
    targetMinutes: 45,
    sections: DEFAULT_SECTIONS.map(newSection),
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function itemFromMovement(m: Movement): PlanItem {
  return {
    id: newId(),
    movementId: m.id,
    durationSec: m.defaultDurationSec ?? 90,
    reps: m.defaultReps,
  };
}

/** Move an item within a section by delta (-1 up, +1 down). Returns a new plan. */
export function moveItem(
  plan: LessonPlan,
  sectionId: string,
  itemId: string,
  delta: number,
): LessonPlan {
  return {
    ...plan,
    sections: plan.sections.map((s) => {
      if (s.id !== sectionId) return s;
      const idx = s.items.findIndex((i) => i.id === itemId);
      const to = idx + delta;
      if (idx < 0 || to < 0 || to >= s.items.length) return s;
      const items = [...s.items];
      const [it] = items.splice(idx, 1);
      items.splice(to, 0, it);
      return { ...s, items };
    }),
  };
}

/** Copy a plan for the same or another owner, with fresh ids. */
export function duplicatePlan(plan: LessonPlan, ownerId: string, name?: string): LessonPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    id: newId(),
    ownerId,
    name: name ?? `${plan.name} (copy)`,
    sections: plan.sections.map((s) => ({
      ...s,
      id: newId(),
      items: s.items.map((i) => ({ ...i, id: newId() })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
