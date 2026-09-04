import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassLog, LessonPlan, Movement } from "./types";
import { SEED_MOVEMENTS } from "./seedMovements";

/**
 * Everything the UI needs from storage. Two implementations: Supabase
 * (per-instructor, behind sign-in) and localStorage ("this device only").
 * The shared seed library is merged in by `listMovements` on both.
 */
export interface Repo {
  readonly userId: string;
  listMovements(): Promise<Movement[]>;
  getMovement(id: string): Promise<Movement | null>;
  saveMovement(m: Movement): Promise<Movement>;
  deleteMovement(id: string): Promise<void>;

  listPlans(): Promise<LessonPlan[]>;
  getPlan(id: string): Promise<LessonPlan | null>;
  savePlan(p: LessonPlan): Promise<LessonPlan>;
  deletePlan(id: string): Promise<void>;

  listLogs(): Promise<ClassLog[]>;
  saveLog(l: ClassLog): Promise<ClassLog>;
  deleteLog(id: string): Promise<void>;
}

export const LOCAL_USER_ID = "local";

export function isSeedMovement(m: Pick<Movement, "ownerId">): boolean {
  return m.ownerId === null;
}

function sortMovements(list: Movement[]): Movement[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function sortPlans(list: LessonPlan[]): LessonPlan[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortLogs(list: ClassLog[]): ClassLog[] {
  return [...list].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? ""),
  );
}

// ---------------------------------------------------------------------------
// localStorage implementation
// ---------------------------------------------------------------------------

const LS_KEYS = {
  movements: "bloom:movements",
  plans: "bloom:plans",
  logs: "bloom:logs",
} as const;

function lsRead<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function lsWrite<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export class LocalRepo implements Repo {
  readonly userId = LOCAL_USER_ID;

  async listMovements() {
    return sortMovements([...SEED_MOVEMENTS, ...lsRead<Movement>(LS_KEYS.movements)]);
  }
  async getMovement(id: string) {
    return (await this.listMovements()).find((m) => m.id === id) ?? null;
  }
  async saveMovement(m: Movement) {
    const now = new Date().toISOString();
    const saved = { ...m, ownerId: this.userId, updatedAt: now, createdAt: m.createdAt ?? now };
    const rest = lsRead<Movement>(LS_KEYS.movements).filter((x) => x.id !== m.id);
    lsWrite(LS_KEYS.movements, [...rest, saved]);
    return saved;
  }
  async deleteMovement(id: string) {
    lsWrite(LS_KEYS.movements, lsRead<Movement>(LS_KEYS.movements).filter((x) => x.id !== id));
  }

  async listPlans() {
    return sortPlans(lsRead<LessonPlan>(LS_KEYS.plans));
  }
  async getPlan(id: string) {
    return lsRead<LessonPlan>(LS_KEYS.plans).find((p) => p.id === id) ?? null;
  }
  async savePlan(p: LessonPlan) {
    const saved = { ...p, ownerId: this.userId, updatedAt: new Date().toISOString() };
    const rest = lsRead<LessonPlan>(LS_KEYS.plans).filter((x) => x.id !== p.id);
    lsWrite(LS_KEYS.plans, [...rest, saved]);
    return saved;
  }
  async deletePlan(id: string) {
    lsWrite(LS_KEYS.plans, lsRead<LessonPlan>(LS_KEYS.plans).filter((x) => x.id !== id));
    // Mirror the database's "on delete set null".
    lsWrite(
      LS_KEYS.logs,
      lsRead<ClassLog>(LS_KEYS.logs).map((l) => (l.planId === id ? { ...l, planId: null } : l)),
    );
  }

  async listLogs() {
    return sortLogs(lsRead<ClassLog>(LS_KEYS.logs));
  }
  async saveLog(l: ClassLog) {
    const saved = { ...l, ownerId: this.userId };
    const rest = lsRead<ClassLog>(LS_KEYS.logs).filter((x) => x.id !== l.id);
    lsWrite(LS_KEYS.logs, [...rest, saved]);
    return saved;
  }
  async deleteLog(id: string) {
    lsWrite(LS_KEYS.logs, lsRead<ClassLog>(LS_KEYS.logs).filter((x) => x.id !== id));
  }
}

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

type MovementRow = {
  id: string;
  owner_id: string;
  name: string;
  discipline: Movement["discipline"];
  level: Movement["level"];
  focus: Movement["focus"];
  equipment: Movement["equipment"];
  description: string;
  cues: string[];
  modifications: string[];
  contraindications: string[];
  springs: string | null;
  default_duration_sec: number | null;
  default_reps: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type PlanRow = {
  id: string;
  owner_id: string;
  name: string;
  discipline: LessonPlan["discipline"];
  level: LessonPlan["level"];
  target_minutes: number;
  sections: LessonPlan["sections"];
  notes: string;
  created_at: string;
  updated_at: string;
};

type LogRow = {
  id: string;
  owner_id: string;
  date: string;
  time: string | null;
  plan_id: string | null;
  title: string;
  discipline: ClassLog["discipline"];
  location: string | null;
  attendees: number | null;
  notes: string;
  created_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function movementFromRow(r: MovementRow): Movement {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    discipline: r.discipline,
    level: r.level,
    focus: r.focus ?? [],
    equipment: r.equipment ?? [],
    description: r.description ?? "",
    cues: r.cues ?? [],
    modifications: r.modifications ?? [],
    contraindications: r.contraindications ?? [],
    springs: r.springs ?? undefined,
    defaultDurationSec: r.default_duration_sec ?? undefined,
    defaultReps: r.default_reps ?? undefined,
    tags: r.tags ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function movementToRow(m: Movement, ownerId: string): Omit<MovementRow, "created_at" | "updated_at"> {
  return {
    id: m.id,
    owner_id: ownerId,
    name: m.name,
    discipline: m.discipline,
    level: m.level,
    focus: m.focus,
    equipment: m.equipment,
    description: m.description,
    cues: m.cues,
    modifications: m.modifications,
    contraindications: m.contraindications,
    springs: m.springs ?? null,
    default_duration_sec: m.defaultDurationSec ?? null,
    default_reps: m.defaultReps ?? null,
    tags: m.tags,
  };
}

function planFromRow(r: PlanRow): LessonPlan {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    discipline: r.discipline,
    level: r.level,
    targetMinutes: r.target_minutes,
    sections: r.sections ?? [],
    notes: r.notes ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function logFromRow(r: LogRow): ClassLog {
  return {
    id: r.id,
    ownerId: r.owner_id,
    date: r.date,
    time: r.time ?? undefined,
    planId: r.plan_id,
    title: r.title,
    discipline: r.discipline,
    location: r.location ?? undefined,
    attendees: r.attendees ?? undefined,
    notes: r.notes ?? "",
    createdAt: r.created_at,
  };
}

function fail(err: { message: string } | null): never {
  throw new Error(err?.message ?? "Unknown Supabase error");
}

export class SupabaseRepo implements Repo {
  constructor(
    private readonly client: SupabaseClient,
    readonly userId: string,
  ) {}

  async listMovements() {
    const { data, error } = await this.client.from("movements").select("*");
    if (error) fail(error);
    return sortMovements([...SEED_MOVEMENTS, ...(data as MovementRow[]).map(movementFromRow)]);
  }
  async getMovement(id: string) {
    const seed = SEED_MOVEMENTS.find((m) => m.id === id);
    if (seed) return seed;
    if (!UUID_RE.test(id)) return null;
    const { data, error } = await this.client.from("movements").select("*").eq("id", id).maybeSingle();
    if (error) fail(error);
    return data ? movementFromRow(data as MovementRow) : null;
  }
  async saveMovement(m: Movement) {
    const { data, error } = await this.client
      .from("movements")
      .upsert({ ...movementToRow(m, this.userId), updated_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) fail(error);
    return movementFromRow(data as MovementRow);
  }
  async deleteMovement(id: string) {
    const { error } = await this.client.from("movements").delete().eq("id", id);
    if (error) fail(error);
  }

  async listPlans() {
    const { data, error } = await this.client.from("lesson_plans").select("*");
    if (error) fail(error);
    return sortPlans((data as PlanRow[]).map(planFromRow));
  }
  async getPlan(id: string) {
    if (!UUID_RE.test(id)) return null;
    const { data, error } = await this.client.from("lesson_plans").select("*").eq("id", id).maybeSingle();
    if (error) fail(error);
    return data ? planFromRow(data as PlanRow) : null;
  }
  async savePlan(p: LessonPlan) {
    const row = {
      id: p.id,
      owner_id: this.userId,
      name: p.name,
      discipline: p.discipline,
      level: p.level,
      target_minutes: p.targetMinutes,
      sections: p.sections,
      notes: p.notes,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.client.from("lesson_plans").upsert(row).select("*").single();
    if (error) fail(error);
    return planFromRow(data as PlanRow);
  }
  async deletePlan(id: string) {
    const { error } = await this.client.from("lesson_plans").delete().eq("id", id);
    if (error) fail(error);
  }

  async listLogs() {
    const { data, error } = await this.client.from("class_logs").select("*");
    if (error) fail(error);
    return sortLogs((data as LogRow[]).map(logFromRow));
  }
  async saveLog(l: ClassLog) {
    const row = {
      id: l.id,
      owner_id: this.userId,
      date: l.date,
      time: l.time ?? null,
      plan_id: l.planId,
      title: l.title,
      discipline: l.discipline,
      location: l.location ?? null,
      attendees: l.attendees ?? null,
      notes: l.notes,
    };
    const { data, error } = await this.client.from("class_logs").upsert(row).select("*").single();
    if (error) fail(error);
    return logFromRow(data as LogRow);
  }
  async deleteLog(id: string) {
    const { error } = await this.client.from("class_logs").delete().eq("id", id);
    if (error) fail(error);
  }
}
