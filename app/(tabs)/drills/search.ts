import { coneSetup } from "@/lib/coneSetup";
import type { Drill } from "@/lib/types";
import { TAG_LABELS } from "./tags";

/** Case-insensitive match across the fields a coach would search by —
 *  shared by the Drills page and the session builder. */
export function drillMatches(d: Drill, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    d.name,
    d.description,
    d.cues ?? "",
    d.equipment,
    coneSetup(d),
    ...d.tags.map((t) => TAG_LABELS[t]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}
