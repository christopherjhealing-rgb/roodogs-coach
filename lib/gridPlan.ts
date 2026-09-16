// Running one drill on several grids at once, so nobody stands in a queue.
// A drill's free-text `players` ("Pairs", "4 (2 v 2)", "4-6 a side") tells us
// how many kids one grid absorbs; the squad size tells us how many grids to
// set up. Pure helpers — unit-tested in gridPlan.test.ts.

import type { Drill } from "./types";

/** How many players one copy of the grid takes, or null when the drill is a
 *  whole-squad activity (a game, "Any") that shouldn't be multiplied.
 *  Ranges resolve to their upper bound — fill each grid before adding one. */
export function playersPerGrid(players: string | undefined): number | null {
  const s = (players ?? "").trim().toLowerCase();
  if (!s) return null;
  // whole-group activities: never split into grids
  if (/whole group|whole squad|two teams|2 teams|\bteams\b|columns|^any/.test(s))
    return null;

  const nums = (s.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0);

  // "3 + 1", "6 + 2 + 2", "2 attackers + 2 defenders" — a total, so add up.
  // Every side of the + must carry a number, so "5-7 + defence" isn't a sum.
  const plusParts = s.split("+").map((x) => x.trim()).filter(Boolean);
  if (plusParts.length > 1) {
    const each = plusParts.map((x) => {
      const m = x.match(/\d+/);
      return m ? Number(m[0]) : null;
    });
    if (each.every((n) => n !== null))
      return (each as number[]).reduce((a, b) => a + b, 0);
  }

  // "4v4", "3v3 to 5v4" — both sides are on the grid
  const vs = [...s.matchAll(/(\d+)\s*v\s*(\d+)/g)].map(
    (m) => Number(m[1]) + Number(m[2])
  );
  if (vs.length) return Math.max(...vs);

  // "4-6 a side" — per team, so double
  const perSide = s.match(/(\d+)\s*(?:a side|per side)/);
  if (perSide) return Number(perSide[1]) * 2;

  if (nums.length) return Math.max(...nums);
  if (/trio/.test(s)) return 3;
  if (/pair/.test(s)) return 2;
  return null;
}

/** Cones one copy of the layout needs, read off the diagram spec:
 *  `box` corners, each `K` marker, and two per gate (`g` / `gv`). */
export function conesPerGrid(spec: string | undefined): number {
  if (!spec) return 0;
  let cones = 0;
  for (const raw of spec.split(";")) {
    const tok = raw.trim().split(/\s+/)[0];
    if (tok === "box") cones += 4;
    else if (tok === "K") cones += 1;
    else if (tok === "g" || tok === "gv") cones += 2;
  }
  return cones;
}

export interface GridPlan {
  /** Players one grid absorbs; null when the drill is whole-squad. */
  perGrid: number | null;
  /** How many copies to set up for the squad. */
  grids: number;
  /** Cones for one grid, and for all of them. */
  conesEach: number;
  conesTotal: number;
  /** Kids left over after filling every grid evenly. */
  spare: number;
  /** False for whole-squad drills — the UI hides the multiplier. */
  canMultiply: boolean;
}

/** Work out the setup for `squadSize` kids, or force a count with `override`. */
export function gridPlan(
  drill: Pick<Drill, "players" | "diagramSpec">,
  squadSize: number,
  override?: number
): GridPlan {
  const perGrid = playersPerGrid(drill.players);
  const conesEach = conesPerGrid(drill.diagramSpec);
  const canMultiply = perGrid !== null && perGrid > 0;
  const suggested =
    canMultiply && squadSize > 0
      ? Math.max(1, Math.ceil(squadSize / (perGrid as number)))
      : 1;
  const grids = Math.max(1, override ?? suggested);
  return {
    perGrid,
    grids,
    conesEach,
    conesTotal: conesEach * grids,
    spare: canMultiply
      ? Math.max(0, squadSize - grids * (perGrid as number))
      : 0,
    canMultiply,
  };
}
