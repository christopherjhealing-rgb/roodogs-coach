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

  it("a fresh device pulls pre-sync data that has no timestamp (0-vs-0 tie)", () => {
    // The real bug: a computer's roster entered before sync existed has u=0;
    // a fresh phone's roster is empty at u=0. The populated side must win.
    const phone = {} as Snapshot; // never written — all empty at u=0
    const cloud = snap({
      [KEYS.players]: { u: 0, d: [{ id: "a" }, { id: "b" }] },
    });
    const { merged, changedLocal } = mergeSnapshots(phone, cloud);
    expect(merged[KEYS.players].d).toEqual([{ id: "a" }, { id: "b" }]);
    expect(changedLocal).toBe(true);
  });

  it("pushes pre-sync data up over an empty store at the same u=0", () => {
    const local = snap({ [KEYS.players]: { u: 0, d: [{ id: "a" }] } });
    const cloud = snap({ [KEYS.players]: { u: 0, d: [] } });
    const { merged, changedRemote } = mergeSnapshots(local, cloud);
    expect(merged[KEYS.players].d).toEqual([{ id: "a" }]);
    expect(changedRemote).toBe(true);
  });

  it("does not resurrect a genuine delete: newer empty beats older populated", () => {
    const stale = snap({ [KEYS.players]: { u: 100, d: [{ id: "a" }] } });
    const deleted = snap({ [KEYS.players]: { u: 200, d: [] } }); // deleted later
    const { merged, changedLocal } = mergeSnapshots(stale, deleted);
    expect(merged[KEYS.players].d).toEqual([]);
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
