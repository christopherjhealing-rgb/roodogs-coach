import type { Discipline, FocusArea, Level, Movement } from "./types";

export interface MovementFilter {
  query: string;
  discipline: Discipline | "all";
  level: Level | "all";
  focus: FocusArea | "all";
  mineOnly: boolean;
}

export const EMPTY_FILTER: MovementFilter = {
  query: "",
  discipline: "all",
  level: "all",
  focus: "all",
  mineOnly: false,
};

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function filterMovements(list: Movement[], f: MovementFilter): Movement[] {
  const terms = norm(f.query).split(/\s+/).filter(Boolean);
  return list.filter((m) => {
    if (f.discipline !== "all" && m.discipline !== f.discipline) return false;
    if (f.level !== "all" && m.level !== f.level) return false;
    if (f.focus !== "all" && !m.focus.includes(f.focus)) return false;
    if (f.mineOnly && m.ownerId === null) return false;
    if (terms.length === 0) return true;
    const hay = norm(
      [m.name, m.description, ...m.cues, ...m.tags, ...m.focus, ...m.equipment, m.springs ?? ""].join(" "),
    );
    return terms.every((t) => hay.includes(t));
  });
}
