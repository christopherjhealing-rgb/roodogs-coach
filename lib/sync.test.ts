import { describe, expect, it } from "vitest";
import { KEYS } from "./storage";
import { mergeSnapshots, type Snapshot } from "./sync";

// Build a snapshot from a partial map of collection → { u, d }.
function snap(parts: Record<string, { u: number; d: unknown }>): Snapshot {
  return parts as Snapshot;
}

describe("mergeSnapshots — per-collection last-write-wins", () => {
  it("takes the newer side per collection and flags what changed", () => {
    const local = snap({
      [KEYS.players]: { u: 100, d: [{ id: "a" }] },
      [KEYS.boards]: { u: 50, d: [{ id: "old" }] },
    });
    const remote = snap({
      [KEYS.players]: { u: 80, d: [{ id: "stale" }] }, // older — local wins
      [KEYS.boards]: { u: 200, d: [{ id: "new" }] }, // newer — remote wins
    });

    const { merged, changedLocal, changedRemote } = mergeSnapshots(
      local,
      remote
    );

    expect(merged[KEYS.players].d).toEqual([{ id: "a" }]);
    expect(merged[KEYS.boards].d).toEqual([{ id: "new" }]);
    expect(changedLocal).toBe(true); // pulled newer boards down
    expect(changedRemote).toBe(true); // have newer players to push up
  });

  it("brings a fresh device fully up to date from remote", () => {
    // Local has never written anything (all u=0); remote has real data.
    const remote = snap({
      [KEYS.players]: { u: 500, d: [{ id: "x" }, { id: "y" }] },
    });
    const { merged, changedLocal, changedRemote } = mergeSnapshots(
      {} as Snapshot,
      remote
    );
    expect(merged[KEYS.players].d).toEqual([{ id: "x" }, { id: "y" }]);
    expect(changedLocal).toBe(true);
    expect(changedRemote).toBe(false); // nothing local worth pushing
  });

  it("keeps local and marks a push when the store is empty", () => {
    const local = snap({ [KEYS.players]: { u: 10, d: [{ id: "a" }] } });
    const { merged, changedLocal, changedRemote } = mergeSnapshots(local, null);
    expect(merged[KEYS.players].d).toEqual([{ id: "a" }]);
    expect(changedLocal).toBe(false);
    expect(changedRemote).toBe(true);
  });

  it("propagates a deletion within a collection (newer wins the whole set)", () => {
    // Coach deleted a drill on the computer: fewer items, but a newer stamp.
    const phone = snap({
      [KEYS.drills]: { u: 100, d: [{ id: "keep" }, { id: "gone" }] },
    });
    const computer = snap({
      [KEYS.drills]: { u: 300, d: [{ id: "keep" }] },
    });
    const { merged, changedLocal } = mergeSnapshots(phone, computer);
    expect(merged[KEYS.drills].d).toEqual([{ id: "keep" }]);
    expect(changedLocal).toBe(true);
  });

  it("treats equal timestamps as no change", () => {
    const a = snap({ [KEYS.players]: { u: 42, d: [{ id: "a" }] } });
    const b = snap({ [KEYS.players]: { u: 42, d: [{ id: "a" }] } });
    const { changedLocal, changedRemote } = mergeSnapshots(a, b);
    expect(changedLocal).toBe(false);
    expect(changedRemote).toBe(false);
  });
});
