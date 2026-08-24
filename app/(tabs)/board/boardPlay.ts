import type { Board } from "@/lib/types";
import { pointAlong } from "./BoardCanvas";

type Pos = { x: number; y: number };

/** Pair each movement (in draw order) with the nearest unclaimed token. */
export function assignMovements(board: Board) {
  const out: { tokenId: string; movement: Board["movements"][number] }[] = [];
  const used = new Set<string>();
  for (const m of board.movements) {
    if (m.points.length < 2) continue;
    let best: string | null = null;
    let bestD = Infinity;
    for (const t of board.tokens) {
      if (used.has(t.id)) continue;
      const d = Math.hypot(t.x - m.points[0].x, t.y - m.points[0].y);
      if (d < bestD) {
        bestD = d;
        best = t.id;
      }
    }
    if (best && bestD <= 10) {
      out.push({ tokenId: best, movement: m });
      used.add(best);
    }
  }
  return out;
}

const easeInOut = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;

export function canPlay(board: Board): boolean {
  return board.movements.some((m) => m.points.length >= 2);
}

/**
 * Run a *sequential* play animation — each movement's token completes its
 * run before the next one starts. Calls onFrame(map) every frame with the
 * animated positions and onDone() at the end. Returns a cancel function.
 */
export function runSequentialPlay(
  board: Board,
  onFrame: (m: Map<string, Pos>) => void,
  onDone: () => void
): () => void {
  const assignments = assignMovements(board);
  if (assignments.length === 0) {
    onDone();
    return () => {};
  }
  const startPos = new Map(board.tokens.map((t) => [t.id, { x: t.x, y: t.y }]));
  const PER = 1300; // ms per movement
  const HOLD = 700; // ms to hold the final frame
  const total = assignments.length * PER + HOLD;
  const start = performance.now();
  let raf = 0;
  let cancelled = false;
  const tick = (now: number) => {
    if (cancelled) return;
    const el = now - start;
    const map = new Map<string, Pos>();
    assignments.forEach((a, i) => {
      const raw = (el - i * PER) / PER;
      if (raw <= 0) {
        // before its turn — stay put at the token's real position
        const home = startPos.get(a.tokenId);
        if (home) map.set(a.tokenId, home);
      } else {
        map.set(a.tokenId, pointAlong(a.movement, easeInOut(Math.min(1, raw))));
      }
    });
    onFrame(map);
    if (el < total) raf = requestAnimationFrame(tick);
    else onDone();
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
