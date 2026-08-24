import { SEED_BOARDS } from "./seedBoards";
import { SEED_DRILLS } from "./seedDrills";
import { storage } from "./storage";

const boardIds = new Set(SEED_BOARDS.map((b) => b.id));

/** Diagram board id for a seed drill, by naming convention, if it exists. */
function boardFor(drillId: string): string | undefined {
  const id = drillId.replace(/^seed-/, "seed-board-");
  return boardIds.has(id) ? id : undefined;
}

// Remember which seed ids have ever been added, so new seeds get merged in
// on upgrade but ones the coach deleted don't keep coming back.
function readSeeded(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}
function writeSeeded(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // storage full/blocked — nothing to do
  }
}

const DRILL_SEEDED_KEY = "roodogs.seededDrillIds";
const BOARD_SEEDED_KEY = "roodogs.seededBoardIds";

/**
 * Idempotently ensure the starter drills and diagram/set-play boards are in
 * storage, adding any that are new since last run (without resurrecting ones
 * the coach deleted) and linking each seed drill to its diagram.
 */
export function ensureSeedData(): void {
  // Boards first, so a drill's linked diagram always exists.
  const boards = storage.getBoards();
  const haveBoard = new Set(boards.map((b) => b.id));
  const seededBoards = readSeeded(BOARD_SEEDED_KEY);
  const newBoards = SEED_BOARDS.filter(
    (b) => !haveBoard.has(b.id) && !seededBoards.has(b.id)
  );
  if (newBoards.length) storage.setBoards([...boards, ...newBoards]);
  writeSeeded(BOARD_SEEDED_KEY, SEED_BOARDS.map((b) => b.id));

  const drills = storage.getDrills();
  const haveDrill = new Set(drills.map((d) => d.id));
  const seededDrills = readSeeded(DRILL_SEEDED_KEY);
  const newDrills = SEED_DRILLS.filter(
    (d) => !haveDrill.has(d.id) && !seededDrills.has(d.id)
  ).map((d) => ({ ...d, boardId: d.boardId ?? boardFor(d.id) }));
  writeSeeded(DRILL_SEEDED_KEY, SEED_DRILLS.map((d) => d.id));

  // Backfill boardId on existing seed drills that predate their diagrams.
  let next = [...drills, ...newDrills];
  let changed = newDrills.length > 0;
  next = next.map((d) => {
    if (!d.boardId) {
      const bid = boardFor(d.id);
      if (bid) {
        changed = true;
        return { ...d, boardId: bid };
      }
    }
    return d;
  });
  if (changed) storage.setDrills(next);
}
