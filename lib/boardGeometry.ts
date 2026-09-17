// Pure geometry for editing board arrows. Kept out of the editor component
// so the fiddly maths can be unit-tested on its own.

export type Pt = { x: number; y: number };

/** Which end of an arrow is being dragged. */
export type ArrowEnd = "start" | "end";

/**
 * Re-shape an arrow when one of its ends is dragged to `to`, holding the
 * other end still.
 *
 * A straight two-point arrow simply gets a new endpoint. A curved or
 * freehand path has more than two points, so moving one end has to decide
 * what happens to everything in between: we rotate and scale the whole path
 * about the fixed end, which keeps the curve's shape intact while it
 * lengthens, shortens or swings around.
 */
export function resizePath(from: Pt[], end: ArrowEnd, to: Pt): Pt[] {
  if (from.length < 2) return from.map((p) => ({ ...p }));
  const movingIdx = end === "start" ? 0 : from.length - 1;
  const anchorIdx = end === "start" ? from.length - 1 : 0;

  const next = from.map((p) => ({ ...p }));
  if (from.length === 2) {
    next[movingIdx] = { x: to.x, y: to.y };
    return next;
  }

  const a = from[anchorIdx];
  const ox = from[movingIdx].x - a.x;
  const oy = from[movingIdx].y - a.y;
  const oLen2 = ox * ox + oy * oy;
  // the arrow has collapsed onto its anchor — there's no direction left to
  // rotate about, so leave the shape alone
  if (oLen2 < 1e-6) return next;

  const nx = to.x - a.x;
  const ny = to.y - a.y;
  // complex division (new / old) gives the rotate-and-scale that carries the
  // old end onto the new one
  const k = (nx * ox + ny * oy) / oLen2;
  const s = (ny * ox - nx * oy) / oLen2;

  return from.map((p) => {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return { x: a.x + k * dx - s * dy, y: a.y + s * dx + k * dy };
  });
}

/** Shortest distance from `p` to the segment ab. */
function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Shortest distance from `p` to a polyline. Used to tell a deliberate tap
 *  on an arrow from a tap that merely landed inside its generous hit band. */
export function distanceToPath(points: Pt[], p: Pt): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y);
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    best = Math.min(best, distanceToSegment(p, points[i], points[i + 1]));
  }
  return best;
}
