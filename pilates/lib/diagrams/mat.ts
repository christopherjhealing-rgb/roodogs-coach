import type { MovementDiagram } from "./types";

/**
 * Mat diagrams, keyed by seed movement id. See types.ts for the angle
 * conventions. Two worked examples are kept at the top as a reference.
 */
export const MAT_DIAGRAMS: Record<string, MovementDiagram> = {
  // Supine, head to the left, legs reaching long on a diagonal, arms
  // pumping just above the mat.
  "seed-mat-hundred": {
    scene: "mat",
    dur: 1.2,
    frames: [
      { hip: [58, 54], torso: 178, head: 150, arm: { upper: 10, lower: 0 }, leg: { upper: -30, lower: -30 } },
      { hip: [58, 54], torso: 178, head: 150, arm: { upper: -6, lower: -10 }, leg: { upper: -30, lower: -30 } },
    ],
  },
  // Roll Up: from lying flat with arms overhead, peel up into a C-curve
  // reaching for the toes.
  "seed-mat-roll-up": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 180, lower: 180 }, leg: { upper: 0, lower: 0 } },
      { hip: [58, 54], torso: -70, head: -20, arm: { upper: 20, lower: 0 }, leg: { upper: 0, lower: 0 } },
      { hip: [58, 54], torso: -45, head: 10, arm: { upper: 5, lower: -5 }, leg: { upper: 0, lower: 0 } },
    ],
  },
  // ---------------------------------------------------------------------------
  // Pre-Pilates and warm-up
  // ---------------------------------------------------------------------------

  // Supine, knees bent, hands resting on the lower ribs to feel the breath.
  "seed-mat-breathing-imprint-release": {
    scene: "mat",
    dur: 3.2,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 20, lower: -60 }, leg: { upper: -55, lower: 75 } },
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 14, lower: -72 }, leg: { upper: -55, lower: 75 } },
    ],
  },
  // Pelvic Curl: feet flat, peel the spine up to a long diagonal on the
  // shoulder blades, then roll down.
  "seed-mat-pelvic-curl": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -52, lower: 78 } },
      { hip: [57.3, 48.8], torso: 165, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -15, lower: 90 } },
    ],
  },
  // Chest Lift: hands behind the head, curl the head and shoulders up.
  "seed-mat-chest-lift": {
    scene: "mat",
    dur: 2.4,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: -100, lower: 130 }, leg: { upper: -55, lower: 78 } },
      { hip: [58, 54], torso: 165, head: -140, arm: { upper: -100, lower: 130 }, leg: { upper: -55, lower: 78 } },
    ],
  },
  // Toe Taps: tabletop legs, one foot lowers to tap the mat.
  "seed-mat-toe-taps": {
    scene: "mat",
    dur: 2,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -75, lower: 15 } },
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, legL: { upper: -75, lower: 15 }, legR: { upper: -45, lower: 60 } },
    ],
  },
  // Dead Bug: near hand presses a ball into the far knee; the free arm and
  // leg reach long.
  "seed-mat-dead-bug": {
    scene: "mat",
    dur: 2.4,
    props: { ball: [54.5, 42.5] },
    frames: [
      { hip: [58, 54], torso: 180, head: 180, armR: { upper: -30, lower: -36 }, armL: { upper: -90, lower: -90 }, legR: { upper: -100, lower: 0 }, legL: { upper: -75, lower: 15 } },
      { hip: [58, 54], torso: 180, head: 180, armR: { upper: -30, lower: -36 }, armL: { upper: 180, lower: 180 }, legR: { upper: -100, lower: 0 }, legL: { upper: -20, lower: -20 } },
    ],
  },
  // Bird Dog: all fours, opposite arm and leg reach level with the torso.
  "seed-mat-bird-dog": {
    scene: "mat",
    dur: 2.6,
    frames: [
      { hip: [46, 44], torso: -18, head: -5, arm: { upper: 90, lower: 90 }, leg: { upper: 90, lower: 180 } },
      { hip: [46, 44], torso: -18, head: -5, armR: { upper: -18, lower: -18 }, armL: { upper: 90, lower: 90 }, legR: { upper: 90, lower: 180 }, legL: { upper: 162, lower: 162 } },
    ],
  },
  // Cat Cow: all fours, arch (cow, head up) to round (cat, head tucked).
  "seed-mat-cat-cow": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [46, 45.5], torso: -24, head: -60, arm: { upper: 90, lower: 90 }, leg: { upper: 90, lower: 180 } },
      { hip: [46, 43.5], torso: -15, head: 50, arm: { upper: 90, lower: 90 }, leg: { upper: 90, lower: 180 } },
    ],
  },
  // Thread the Needle: all fours, near arm reaches to the ceiling then
  // threads under the body.
  "seed-mat-thread-the-needle": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [46, 44], torso: -18, head: -40, armR: { upper: -90, lower: -90 }, armL: { upper: 90, lower: 90 }, leg: { upper: 90, lower: 180 } },
      { hip: [46, 43], torso: -8, head: 25, armR: { upper: 150, lower: 170 }, armL: { upper: 115, lower: 65 }, leg: { upper: 90, lower: 180 } },
    ],
  },
  // Clam: side-lying (drawn face-on to the front of the body), knees bent,
  // band above the knees; the top knee opens.
  "seed-mat-clam": {
    scene: "mat",
    dur: 2,
    props: { band: "thighs" },
    frames: [
      { hip: [58, 54], torso: 180, head: 180, armL: { upper: 180, lower: 180 }, armR: { upper: -60, lower: 120 }, leg: { upper: -30, lower: 60 } },
      { hip: [58, 54], torso: 180, head: 180, armL: { upper: 180, lower: 180 }, armR: { upper: -60, lower: 120 }, legL: { upper: -30, lower: 60 }, legR: { upper: -58, lower: 75 } },
    ],
  },
  // Side-lying Leg Series: body in one line, top leg lifts and lowers.
  "seed-mat-side-lying-leg-series": {
    scene: "mat",
    dur: 2.2,
    props: { band: "thighs" },
    frames: [
      { hip: [58, 54], torso: 180, head: 180, armL: { upper: 180, lower: 180 }, armR: { upper: -60, lower: 120 }, legL: { upper: 0, lower: 0 }, legR: { upper: -5, lower: -5 } },
      { hip: [58, 54], torso: 180, head: 180, armL: { upper: 180, lower: 180 }, armR: { upper: -60, lower: 120 }, legL: { upper: 0, lower: 0 }, legR: { upper: -35, lower: -35 } },
    ],
  },
  // Plank Variations: full plank on the hands, then lowered to the forearms.
  "seed-mat-plank-variations": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [56, 46.5], torso: -24, head: -10, arm: { upper: 90, lower: 90 }, leg: { upper: 156, lower: 156 } },
      { hip: [57.2, 50], torso: -15, head: -5, arm: { upper: 95, lower: 0 }, leg: { upper: 165, lower: 165 } },
    ],
  },
  // Mermaid: legs folded to one side, reach up then bend over the
  // supporting hand.
  "seed-mat-mermaid-stretch": {
    scene: "mat",
    dur: 3.2,
    frames: [
      { hip: [58, 52], torso: -90, head: -90, armR: { upper: -90, lower: -90 }, armL: { upper: 100, lower: 80 }, legL: { upper: 10, lower: 170 }, legR: { upper: 5, lower: 175 } },
      { hip: [58, 52], torso: -120, head: -130, armR: { upper: -130, lower: -140 }, armL: { upper: 110, lower: 95 }, legL: { upper: 10, lower: 170 }, legR: { upper: 5, lower: 175 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Classical sequence
  // ---------------------------------------------------------------------------

  // Roll Over: legs to the ceiling, then hips lift and legs carry overhead
  // parallel to the floor.
  "seed-mat-roll-over": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -90, lower: -90 } },
      { hip: [43.2, 34.7], torso: 105, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: 180, lower: 180 } },
    ],
  },
  // Single Leg Circles: one leg long on the mat, the other circles.
  "seed-mat-single-leg-circles": {
    scene: "mat",
    dur: 2,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, legL: { upper: 0, lower: 0 }, legR: { upper: -55, lower: -55 } },
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, legL: { upper: 0, lower: 0 }, legR: { upper: -90, lower: -90 } },
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, legL: { upper: 0, lower: 0 }, legR: { upper: -115, lower: -115 } },
    ],
  },
  // Rolling Like a Ball: tight C curve, roll back to the shoulder blades.
  "seed-mat-rolling-like-a-ball": {
    scene: "mat",
    dur: 2,
    frames: [
      { hip: [58, 52], torso: -60, head: -10, arm: { upper: 40, lower: 120 }, leg: { upper: -35, lower: 55 } },
      { hip: [53.3, 43], torso: 150, head: -160, arm: { upper: -110, lower: -30 }, leg: { upper: 180, lower: -90 } },
    ],
  },
  // Single Leg Stretch: curled up, one knee hugged in, the other leg long.
  "seed-mat-single-leg-stretch": {
    scene: "mat",
    dur: 1.6,
    frames: [
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: -10, lower: -28 }, legR: { upper: -120, lower: 0 }, legL: { upper: -25, lower: -25 } },
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: -10, lower: -28 }, legR: { upper: -25, lower: -25 }, legL: { upper: -120, lower: 0 } },
    ],
  },
  // Double Leg Stretch: hug both knees, then reach arms and legs long.
  "seed-mat-double-leg-stretch": {
    scene: "mat",
    dur: 2.4,
    frames: [
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: -10, lower: -28 }, leg: { upper: -120, lower: 0 } },
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: 160, lower: 160 }, leg: { upper: -30, lower: -30 } },
    ],
  },
  // Single Straight Leg Stretch: scissor the straight legs, hands behind
  // the top calf.
  "seed-mat-single-straight-leg-stretch": {
    scene: "mat",
    dur: 1.6,
    frames: [
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: -40, lower: -40 }, legR: { upper: -105, lower: -105 }, legL: { upper: -15, lower: -15 } },
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: -40, lower: -40 }, legR: { upper: -15, lower: -15 }, legL: { upper: -105, lower: -105 } },
    ],
  },
  // Double Straight Leg Stretch: hands behind the head, legs lower and lift.
  "seed-mat-double-straight-leg-stretch": {
    scene: "mat",
    dur: 2.4,
    frames: [
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: -100, lower: 130 }, leg: { upper: -85, lower: -85 } },
      { hip: [58, 54], torso: 168, head: -145, arm: { upper: -100, lower: 130 }, leg: { upper: -35, lower: -35 } },
    ],
  },
  // Criss Cross: hands behind the head, one knee in as the other leg
  // reaches long, alternating.
  "seed-mat-criss-cross": {
    scene: "mat",
    dur: 1.6,
    frames: [
      { hip: [58, 54], torso: 165, head: -140, arm: { upper: -100, lower: 130 }, legL: { upper: -95, lower: 5 }, legR: { upper: -20, lower: -20 } },
      { hip: [58, 54], torso: 165, head: -140, arm: { upper: -100, lower: 130 }, legL: { upper: -20, lower: -20 }, legR: { upper: -95, lower: 5 } },
    ],
  },
  // Spine Stretch Forward: sit tall, arms forward, round forward over the legs.
  "seed-mat-spine-stretch-forward": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [58, 52], torso: -90, head: -90, arm: { upper: 0, lower: 0 }, leg: { upper: 10, lower: 5 } },
      { hip: [58, 52], torso: -55, head: 0, arm: { upper: 20, lower: 15 }, leg: { upper: 10, lower: 5 } },
    ],
  },
  // Open Leg Rocker: balance holding the ankles, roll back and up.
  "seed-mat-open-leg-rocker": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [58, 52], torso: -65, head: -40, arm: { upper: 60, lower: -36 }, leg: { upper: -35, lower: -35 } },
      { hip: [53.3, 43], torso: 150, head: 175, arm: { upper: -85, lower: 179 }, leg: { upper: 180, lower: 180 } },
    ],
  },
  // Corkscrew: legs together circle from the ceiling to each side.
  "seed-mat-corkscrew": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -60, lower: -60 } },
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -90, lower: -90 } },
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -120, lower: -120 } },
    ],
  },
  // Saw: sit tall with arms wide, twist and reach the front hand past the
  // opposite foot.
  "seed-mat-saw": {
    scene: "mat",
    dur: 2.6,
    frames: [
      { hip: [58, 52], torso: -90, head: -90, armR: { upper: 0, lower: 0 }, armL: { upper: 180, lower: 180 }, legL: { upper: 10, lower: 5 }, legR: { upper: 5, lower: 0 } },
      { hip: [58, 52], torso: -55, head: 0, armR: { upper: 40, lower: 35 }, armL: { upper: 170, lower: 160 }, legL: { upper: 10, lower: 5 }, legR: { upper: 5, lower: 0 } },
    ],
  },
  // Swan Dive: press up into a swan, then rock forward onto the chest as
  // the legs lift.
  "seed-mat-swan-dive": {
    scene: "mat",
    dur: 2.4,
    frames: [
      { hip: [58, 54], torso: -45, head: -40, arm: { upper: 100, lower: 70 }, leg: { upper: 180, lower: 180 } },
      { hip: [56, 51], torso: -10, head: -10, arm: { upper: -20, lower: -10 }, leg: { upper: -145, lower: -145 } },
    ],
  },
  // Single Leg Kick: propped on the forearms, alternate heels kick to the seat.
  "seed-mat-single-leg-kick": {
    scene: "mat",
    dur: 1.6,
    frames: [
      { hip: [58, 54], torso: -30, head: -20, arm: { upper: 100, lower: 0 }, legL: { upper: 180, lower: 180 }, legR: { upper: 180, lower: -80 } },
      { hip: [58, 54], torso: -30, head: -20, arm: { upper: 100, lower: 0 }, legL: { upper: 180, lower: -80 }, legR: { upper: 180, lower: 180 } },
    ],
  },
  // Double Leg Kick: hands clasped on the back, both heels kick, then the
  // chest lifts as the arms reach back.
  "seed-mat-double-leg-kick": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [58, 54], torso: 0, head: 0, arm: { upper: -165, lower: 180 }, leg: { upper: 180, lower: -80 } },
      { hip: [58, 54], torso: -30, head: -30, arm: { upper: 170, lower: 175 }, leg: { upper: 180, lower: 180 } },
    ],
  },
  // Neck Pull: hands behind the head, curl up and over, restack tall.
  "seed-mat-neck-pull": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: -100, lower: 130 }, leg: { upper: 0, lower: 0 } },
      { hip: [58, 54], torso: -60, head: -10, arm: { upper: -20, lower: 150 }, leg: { upper: 0, lower: 0 } },
      { hip: [58, 54], torso: -90, head: -90, arm: { upper: -50, lower: 160 }, leg: { upper: 0, lower: 0 } },
    ],
  },
  // Scissors: hips lifted onto the hands, legs split toward and away from
  // the head.
  "seed-mat-scissors": {
    scene: "mat",
    dur: 1.6,
    frames: [
      { hip: [44.8, 35.2], torso: 110, head: 180, arm: { upper: 10, lower: -100 }, legR: { upper: -150, lower: -150 }, legL: { upper: -60, lower: -60 } },
      { hip: [44.8, 35.2], torso: 110, head: 180, arm: { upper: 10, lower: -100 }, legR: { upper: -60, lower: -60 }, legL: { upper: -150, lower: -150 } },
    ],
  },
  // Bicycle: same lifted position, one leg long toward the head while the
  // other bends and sweeps.
  "seed-mat-bicycle": {
    scene: "mat",
    dur: 1.8,
    frames: [
      { hip: [44.8, 35.2], torso: 110, head: 180, arm: { upper: 10, lower: -100 }, legR: { upper: -150, lower: -150 }, legL: { upper: -30, lower: 90 } },
      { hip: [44.8, 35.2], torso: 110, head: 180, arm: { upper: 10, lower: -100 }, legR: { upper: -30, lower: 90 }, legL: { upper: -150, lower: -150 } },
    ],
  },
  // Shoulder Bridge: hips high, one leg extends to the ceiling and lowers.
  "seed-mat-shoulder-bridge": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [57.3, 48.8], torso: 165, head: 180, arm: { upper: 12, lower: 0 }, legL: { upper: -15, lower: 90 }, legR: { upper: -80, lower: -80 } },
      { hip: [57.3, 48.8], torso: 165, head: 180, arm: { upper: 12, lower: 0 }, legL: { upper: -15, lower: 90 }, legR: { upper: -25, lower: -25 } },
    ],
  },
  // Spine Twist: sit tall with arms wide, rotate so the arms swap
  // front and back.
  "seed-mat-spine-twist": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [58, 52], torso: -90, head: -90, armR: { upper: -10, lower: -10 }, armL: { upper: -170, lower: -170 }, leg: { upper: 10, lower: 5 } },
      { hip: [58, 52], torso: -90, head: -90, armR: { upper: 170, lower: 170 }, armL: { upper: 10, lower: 10 }, leg: { upper: 10, lower: 5 } },
    ],
  },
  // Jackknife: legs up, roll over, then shoot the legs to the ceiling.
  "seed-mat-jackknife": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -90, lower: -90 } },
      { hip: [43.2, 34.7], torso: 105, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: 180, lower: 180 } },
      { hip: [38, 34], torso: 90, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: -90, lower: -90 } },
    ],
  },
  // Side Kick Series: side-lying, top leg kicks front and back.
  "seed-mat-side-kick-series": {
    scene: "mat",
    dur: 1.8,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, armL: { upper: 180, lower: 180 }, armR: { upper: -60, lower: 120 }, legL: { upper: -10, lower: -10 }, legR: { upper: -70, lower: -70 } },
      { hip: [58, 54], torso: 180, head: 180, armL: { upper: 180, lower: 180 }, armR: { upper: -60, lower: 120 }, legL: { upper: -10, lower: -10 }, legR: { upper: 8, lower: 8 } },
    ],
  },
  // Teaser: lying with legs on a diagonal, roll up through halfway to the V.
  "seed-mat-teaser": {
    scene: "mat",
    dur: 3,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 170, lower: 170 }, leg: { upper: -30, lower: -30 } },
      { hip: [58, 54], torso: -150, head: -120, arm: { upper: -40, lower: -40 }, leg: { upper: -30, lower: -30 } },
      { hip: [58, 52], torso: -65, head: -50, arm: { upper: -30, lower: -30 }, leg: { upper: -35, lower: -35 } },
    ],
  },
  // Hip Circles: balance on the hands behind, legs together circle.
  "seed-mat-hip-circles": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [58, 52], torso: -125, head: -100, arm: { upper: 115, lower: 100 }, leg: { upper: -30, lower: -30 } },
      { hip: [58, 52], torso: -125, head: -100, arm: { upper: 115, lower: 100 }, leg: { upper: -60, lower: -60 } },
      { hip: [58, 52], torso: -125, head: -100, arm: { upper: 115, lower: 100 }, leg: { upper: -85, lower: -85 } },
    ],
  },
  // Swimming: prone, chest lifted, opposite arm and leg flutter.
  "seed-mat-swimming": {
    scene: "mat",
    dur: 1.2,
    frames: [
      { hip: [58, 54], torso: -20, head: -25, armR: { upper: -35, lower: -35 }, armL: { upper: -15, lower: -15 }, legL: { upper: -160, lower: -160 }, legR: { upper: -172, lower: -172 } },
      { hip: [58, 54], torso: -20, head: -25, armR: { upper: -15, lower: -15 }, armL: { upper: -35, lower: -35 }, legL: { upper: -172, lower: -172 }, legR: { upper: -160, lower: -160 } },
    ],
  },
  // Leg Pull Front: plank, one leg lifts toward the ceiling.
  "seed-mat-leg-pull-front": {
    scene: "mat",
    dur: 2.4,
    frames: [
      { hip: [56, 46.5], torso: -24, head: -10, arm: { upper: 90, lower: 90 }, leg: { upper: 156, lower: 156 } },
      { hip: [56, 46.5], torso: -24, head: -10, arm: { upper: 90, lower: 90 }, legL: { upper: 156, lower: 156 }, legR: { upper: -165, lower: -165 } },
    ],
  },
  // Leg Pull Back: reverse plank on the hands, one leg kicks up.
  "seed-mat-leg-pull-back": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [62.1, 46.5], torso: -155, head: -140, arm: { upper: 100, lower: 100 }, leg: { upper: 25, lower: 25 } },
      { hip: [62.1, 46.5], torso: -155, head: -140, arm: { upper: 100, lower: 100 }, legL: { upper: 25, lower: 25 }, legR: { upper: -40, lower: -40 } },
    ],
  },
  // Side Kick Kneeling: one knee down, hand on the mat, free leg sweeps
  // forward and back at hip height.
  "seed-mat-side-kick-kneeling": {
    scene: "mat",
    dur: 2,
    frames: [
      { hip: [55, 45], torso: -150, head: -130, armL: { upper: 100, lower: 95 }, armR: { upper: -60, lower: 180 }, legL: { upper: 90, lower: 180 }, legR: { upper: -25, lower: -25 } },
      { hip: [55, 45], torso: -150, head: -130, armL: { upper: 100, lower: 95 }, armR: { upper: -60, lower: 180 }, legL: { upper: 90, lower: 180 }, legR: { upper: 15, lower: 15 } },
    ],
  },
  // Side Bend: from sitting on one hip, press up into a side plank with the
  // top arm arcing overhead.
  "seed-mat-side-bend": {
    scene: "mat",
    dur: 2.6,
    frames: [
      { hip: [58, 54], torso: -130, head: -140, armL: { upper: 100, lower: 95 }, armR: { upper: -30, lower: 60 }, leg: { upper: 5, lower: 175 } },
      { hip: [63.1, 45.5], torso: -155, head: -140, armL: { upper: 100, lower: 95 }, armR: { upper: -110, lower: -160 }, leg: { upper: 25, lower: 25 } },
    ],
  },
  // Boomerang: sit tall, roll over with the legs overhead, roll up through
  // a Teaser.
  "seed-mat-boomerang": {
    scene: "mat",
    dur: 3.2,
    frames: [
      { hip: [58, 52], torso: -85, head: -85, arm: { upper: 100, lower: 100 }, legL: { upper: 8, lower: 5 }, legR: { upper: 6, lower: 3 } },
      { hip: [43.2, 34.7], torso: 105, head: 180, arm: { upper: 12, lower: 0 }, leg: { upper: 180, lower: 180 } },
      { hip: [58, 52], torso: -65, head: -50, arm: { upper: -30, lower: -30 }, leg: { upper: -35, lower: -35 } },
    ],
  },
  // Seal: knees open, hands hold the ankles from inside, roll back and up.
  "seed-mat-seal": {
    scene: "mat",
    dur: 2,
    frames: [
      { hip: [58, 52], torso: -60, head: -10, arm: { upper: 75, lower: 65 }, leg: { upper: -25, lower: 55 } },
      { hip: [53.3, 43], torso: 150, head: -160, arm: { upper: -75, lower: -85 }, leg: { upper: -170, lower: -90 } },
    ],
  },
  // Crab: tight ball holding the feet, roll forward to the crown of the head.
  "seed-mat-crab": {
    scene: "mat",
    dur: 2.4,
    frames: [
      { hip: [58, 52], torso: -60, head: -10, arm: { upper: 100, lower: 80 }, leg: { upper: -70, lower: 60 } },
      { hip: [50, 46], torso: 5, head: 100, arm: { upper: 160, lower: 140 }, leg: { upper: -20, lower: 110 } },
    ],
  },
  // Rocking: prone bow holding the feet, rock forward onto the chest.
  "seed-mat-rocking": {
    scene: "mat",
    dur: 2,
    frames: [
      { hip: [58, 54], torso: -25, head: -30, arm: { upper: 175, lower: 180 }, leg: { upper: -160, lower: -60 } },
      { hip: [60, 52], torso: -8, head: -10, arm: { upper: -165, lower: -160 }, leg: { upper: -140, lower: -40 } },
    ],
  },
  // Control Balance: rolled over with one foot on the mat held by both
  // hands, the other leg reaching to the ceiling; switch.
  "seed-mat-control-balance": {
    scene: "mat",
    dur: 2.2,
    frames: [
      { hip: [43.2, 34.7], torso: 105, head: 180, arm: { upper: -165, lower: 170 }, legL: { upper: 130, lower: 130 }, legR: { upper: -85, lower: -85 } },
      { hip: [43.2, 34.7], torso: 105, head: 180, arm: { upper: -165, lower: 170 }, legL: { upper: -85, lower: -85 }, legR: { upper: 130, lower: 130 } },
    ],
  },
  // Push Up: plank, bend the elbows close to the body to lower, press up.
  "seed-mat-push-up": {
    scene: "mat",
    dur: 2,
    frames: [
      { hip: [56, 46.5], torso: -24, head: -10, arm: { upper: 90, lower: 90 }, leg: { upper: 156, lower: 156 } },
      { hip: [56, 50.5], torso: -24, head: -10, arm: { upper: 150, lower: 55 }, leg: { upper: 162, lower: 162 } },
    ],
  },
};
