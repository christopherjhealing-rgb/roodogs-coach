import { SEED_KIT_DRILLS } from "./seedDrillsKit";
import { SEED_EXTRA_DRILLS } from "./seedDrillsExtra";
import { storage } from "./storage";
import type { Drill } from "./types";

// One consistent library: the imported kit plus a few hand-drawn set-piece
// extras, all with animated diagram specs. The original board-diagram starter
// drills (ids `seed-*`) and their example boards (ids `seed-board-*`) have
// been retired and are cleaned out of storage below. The Board tab now holds
// only the coach's own boards (which have generated uuid ids, never the seed
// prefix, so the cleanup can't touch them).
const ALL_SEED_DRILLS: Drill[] = [...SEED_KIT_DRILLS, ...SEED_EXTRA_DRILLS];

/**
 * Idempotently ensure the drill library is in storage, adding any new since
 * last run (without resurrecting ones the coach deleted). The "which seeds
 * have ever been added" sets live in storage so cloud sync carries them
 * between devices.
 */
export function ensureSeedData(): void {
  // Retire the orphaned example boards left over from the old starter drills.
  const storedBoards = storage.getBoards();
  const keptBoards = storedBoards.filter(
    (b) => !b.id.startsWith("seed-board-")
  );
  if (keptBoards.length !== storedBoards.length)
    storage.setBoards(keptBoards);

  // Retire the old board-diagram starter drills wherever they still linger, so
  // the library is one consistent set in the new animated-diagram style.
  const stored = storage.getDrills();
  const drills = stored.filter((d) => !d.id.startsWith("seed-"));
  let changed = drills.length !== stored.length;

  const haveDrill = new Set(drills.map((d) => d.id));
  const seededDrills = new Set(storage.getSeededDrillIds());
  const newDrills = ALL_SEED_DRILLS.filter(
    (d) => !haveDrill.has(d.id) && !seededDrills.has(d.id)
  );
  storage.setSeededDrillIds(ALL_SEED_DRILLS.map((d) => d.id));

  if (newDrills.length) changed = true;
  if (changed) storage.setDrills([...drills, ...newDrills]);
}
