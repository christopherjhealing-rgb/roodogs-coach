import type { MovementDiagram } from "./types";

/**
 * Reformer diagrams, keyed by seed movement id. The carriage top is at
 * y = 50, the footbar at x = 100 (bar at y = 36), the straps riser at
 * x = 8. Supine on the carriage: hip around [50, 47], torso 180, feet
 * toward the footbar (angles near 0). Two worked examples at the top.
 */
export const REFORMER_DIAGRAMS: Record<string, MovementDiagram> = {
  // Footwork on the toes: supine, feet on the bar, pressing out and in.
  "seed-reformer-footwork-toes": {
    scene: "reformer",
    caption: "Springs: 3 red",
    dur: 2.2,
    frames: [
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -35, lower: 40 } },
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -10, lower: -8 } },
    ],
  },
  // Long stretch: plank on the carriage, hands on the footbar, pushing
  // the carriage out and pulling it home.
  "seed-reformer-long-stretch": {
    scene: "reformer",
    caption: "Springs: 1 red",
    dur: 2.8,
    frames: [
      { hip: [64, 32], torso: -12, head: -8, arm: { upper: 80, lower: 90 }, leg: { upper: 165, lower: 172 } },
      { hip: [54, 33], torso: -8, head: -5, arm: { upper: 55, lower: 80 }, leg: { upper: 168, lower: 174 } },
    ],
  },
};
