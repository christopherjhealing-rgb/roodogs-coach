import { SEED_BOARDS } from "./seedBoards";
import { SEED_DRILLS } from "./seedDrills";
import { SEED_KIT_DRILLS } from "./seedDrillsKit";
import { storage } from "./storage";

// The starter set plus the imported library. Kit drills carry a diagramSpec
// instead of a linked board, so board backfill leaves them alone.
const ALL_SEED_DRILLS = [...SEED_DRILLS, ...SEED_KIT_DRILLS];

const boardIds = new Set(SEED_BOARDS.map((b) => b.id));

/** Diagram board id for a seed drill, by naming convention, if it exists. */
function boardFor(drillId: string): string | undefined {
  const id = drillId.replace(/^seed-/, "seed-board-");
  return boardIds.has(id) ? id : undefined;
}

/**
 * Idempotently ensure the starter drills and diagram/set-play boards are in
 * storage, adding any that are new since last run (without resurrecting ones
 * the coach deleted) and linking each seed drill to its diagram.
 *
 * The "which seeds have ever been added" sets live in storage so cloud sync
 * carries them between devices — otherwise a fresh device would re-add starter
 * content the coach had already deleted elsewhere.
 */
export function ensureSeedData(): void {
  // Boards first, so a drill's linked diagram always exists.
  const boards = storage.getBoards();
  const haveBoard = new Set(boards.map((b) => b.id));
  const seededBoards = new Set(storage.getSeededBoardIds());
  const newBoards = SEED_BOARDS.filter(
    (b) => !haveBoard.has(b.id) && !seededBoards.has(b.id)
  );
  if (newBoards.length) storage.setBoards([...boards, ...newBoards]);
  storage.setSeededBoardIds(SEED_BOARDS.map((b) => b.id));

  const drills = storage.getDrills();
  const haveDrill = new Set(drills.map((d) => d.id));
  const seededDrills = new Set(storage.getSeededDrillIds());
  const newDrills = ALL_SEED_DRILLS.filter(
    (d) => !haveDrill.has(d.id) && !seededDrills.has(d.id)
  ).map((d) => ({ ...d, boardId: d.boardId ?? boardFor(d.id) }));
  storage.setSeededDrillIds(ALL_SEED_DRILLS.map((d) => d.id));

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
