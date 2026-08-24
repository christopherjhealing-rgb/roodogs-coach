import { SEED_BOARDS } from "./seedBoards";
import { SEED_DRILLS } from "./seedDrills";
import { storage } from "./storage";

const boardIds = new Set(SEED_BOARDS.map((b) => b.id));

/** Diagram board id for a seed drill, by naming convention, if it exists. */
function boardFor(drillId: string): string | undefined {
  const id = drillId.replace(/^seed-/, "seed-board-");
  return boardIds.has(id) ? id : undefined;
}

/**
 * Idempotently ensure the starter drills and their diagram boards are in
 * storage, and that each seed drill is linked to its diagram. Safe to call
 * on every visit — it only writes when something is missing.
 */
export function ensureSeedData(): void {
  // Seed the diagram boards first so a drill's linked board always exists.
  const boards = storage.getBoards();
  const have = new Set(boards.map((b) => b.id));
  const missingBoards = SEED_BOARDS.filter((b) => !have.has(b.id));
  if (missingBoards.length) storage.setBoards([...boards, ...missingBoards]);

  let drills = storage.getDrills();
  if (drills.length === 0) {
    drills = SEED_DRILLS.map((d) => ({
      ...d,
      boardId: d.boardId ?? boardFor(d.id),
    }));
    storage.setDrills(drills);
    return;
  }

  // Backfill boardId on seed drills that predate the diagrams.
  let changed = false;
  drills = drills.map((d) => {
    if (!d.boardId) {
      const bid = boardFor(d.id);
      if (bid) {
        changed = true;
        return { ...d, boardId: bid };
      }
    }
    return d;
  });
  if (changed) storage.setDrills(drills);
}
