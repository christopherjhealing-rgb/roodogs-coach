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
      { hip: [62, 40], torso: -22, head: -10, arm: { upper: 10, lower: 10 }, leg: { upper: 156, lower: 156 } },
      { hip: [64, 45], torso: -20, head: -8, arm: { upper: -7, lower: -7 }, leg: { upper: 167, lower: 167 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Footwork family: supine, head on the headrest, feet on the footbar,
  // pressing the carriage out and drawing it home.
  // ---------------------------------------------------------------------------
  "seed-reformer-footwork-arches": {
    scene: "reformer",
    caption: "Springs: 3 red",
    dur: 2.2,
    frames: [
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -40, lower: 36 } },
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -12, lower: -10 } },
    ],
  },
  "seed-reformer-footwork-heels": {
    scene: "reformer",
    caption: "Springs: 3 red",
    dur: 2.2,
    frames: [
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -38, lower: 38 } },
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -12, lower: -12 } },
    ],
  },
  // Legs stay long, only the ankles move: heels drop under the bar, then lift.
  "seed-reformer-footwork-tendon-stretch": {
    scene: "reformer",
    caption: "Springs: 3 red",
    dur: 2.6,
    frames: [
      { hip: [62, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -12, lower: -18 } },
      { hip: [62, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -10, lower: 2 } },
    ],
  },
  // Heels kept low under the bar throughout the press.
  "seed-reformer-footwork-prehensile": {
    scene: "reformer",
    caption: "Springs: 3 red",
    dur: 2.2,
    frames: [
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -35, lower: 45 } },
      { hip: [60, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -8, lower: 2 } },
    ],
  },
  // Carriage held out, one knee bends as the other heel drops: pedalling.
  "seed-reformer-running": {
    scene: "reformer",
    caption: "Springs: 3 red",
    dur: 1.2,
    frames: [
      { hip: [62, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, legL: { upper: -35, lower: 20 }, legR: { upper: -12, lower: -14 } },
      { hip: [62, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, legL: { upper: -12, lower: -14 }, legR: { upper: -35, lower: 20 } },
    ],
  },
  // Pelvis a few centimetres off the carriage, resting on the shoulder blades.
  "seed-reformer-pelvic-lift": {
    scene: "reformer",
    caption: "Springs: 2 red + 1 blue",
    dur: 2.4,
    frames: [
      { hip: [62, 43], torso: 170, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -40, lower: 40 } },
      { hip: [62, 43], torso: 170, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -12, lower: -8 } },
    ],
  },
  // Peel up into a bridge, then press the carriage out with the hips high.
  "seed-reformer-bridging": {
    scene: "reformer",
    caption: "Springs: 1 red + 1 blue",
    dur: 3,
    frames: [
      { hip: [66, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -45, lower: 35 } },
      { hip: [70, 37], torso: 150, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -15, lower: 30 } },
      { hip: [70, 37], torso: 150, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -12, lower: 5 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Supine with the straps in the hands.
  // ---------------------------------------------------------------------------
  // Head and shoulders curled, legs on a diagonal, arms pumping the straps.
  "seed-reformer-hundred": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red + 1 blue",
    dur: 1.2,
    frames: [
      { hip: [58, 47], torso: -172, head: -140, arm: { upper: 0, lower: -5 }, leg: { upper: -30, lower: -30 } },
      { hip: [58, 47], torso: -172, head: -140, arm: { upper: -12, lower: -18 }, leg: { upper: -30, lower: -30 } },
    ],
  },
  // Elbows by the ribs and knees to the chest, then arms and legs press out.
  "seed-reformer-coordination": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red + 1 blue",
    dur: 2.4,
    frames: [
      { hip: [58, 47], torso: -172, head: -140, arm: { upper: 0, lower: -100 }, leg: { upper: -110, lower: 20 } },
      { hip: [58, 47], torso: -172, head: -140, arm: { upper: 0, lower: -5 }, leg: { upper: -25, lower: -25 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Feet in straps.
  // ---------------------------------------------------------------------------
  // Knees bent open in a diamond, pressing out long on a low diagonal.
  "seed-reformer-frog": {
    scene: "reformer",
    props: { straps: "feet" },
    caption: "Springs: 1 red + 1 blue",
    dur: 2.6,
    frames: [
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -60, lower: 30 } },
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -30, lower: -30 } },
    ],
  },
  // Legs straight in the straps sweeping up, around and down to the diagonal.
  "seed-reformer-leg-circles": {
    scene: "reformer",
    props: { straps: "feet" },
    caption: "Springs: 1 red + 1 blue",
    dur: 2.8,
    frames: [
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -75, lower: -75 } },
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, legL: { upper: -45, lower: -45 }, legR: { upper: -65, lower: -65 } },
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -25, lower: -25 } },
    ],
  },
  // Lower and lift, open into a V, down to the low diagonal.
  "seed-reformer-feet-in-straps-series": {
    scene: "reformer",
    props: { straps: "feet" },
    caption: "Springs: 1 red + 1 blue",
    dur: 3,
    frames: [
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -80, lower: -80 } },
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, legL: { upper: -60, lower: -60 }, legR: { upper: -40, lower: -40 } },
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -25, lower: -25 } },
    ],
  },
  // Legs out long, fold over and roll the hips up, then bend the knees
  // toward the shoulders and roll the spine down.
  "seed-reformer-short-spine": {
    scene: "reformer",
    props: { straps: "feet" },
    caption: "Springs: 1 red + 1 blue",
    dur: 3.2,
    frames: [
      { hip: [58, 47], torso: 180, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: -25, lower: -25 } },
      { hip: [46, 30], torso: 109, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: 170, lower: 170 } },
      { hip: [46, 30], torso: 109, head: 178, arm: { upper: 5, lower: 5 }, leg: { upper: 180, lower: 95 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Rowing: seated on the carriage, legs long. Into the Sternum and 90
  // Degrees face the straps (left); From the Chest / Hips face the footbar.
  // ---------------------------------------------------------------------------
  "seed-reformer-rowing-into-the-sternum": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 3.2,
    frames: [
      { hip: [64, 47], torso: -90, head: -90, arm: { upper: 95, lower: -110 }, leg: { upper: 180, lower: 180 } },
      { hip: [64, 47], torso: -55, head: -55, arm: { upper: -150, lower: -160 }, leg: { upper: 180, lower: 180 } },
      { hip: [64, 47], torso: -140, head: -175, arm: { upper: 165, lower: 140 }, leg: { upper: 180, lower: 180 } },
    ],
  },
  "seed-reformer-rowing-90-degrees": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 3.2,
    frames: [
      { hip: [64, 47], torso: -90, head: -90, arm: { upper: 180, lower: 180 }, leg: { upper: 180, lower: 180 } },
      { hip: [64, 47], torso: -55, head: -55, arm: { upper: -145, lower: -145 }, leg: { upper: 180, lower: 180 } },
      { hip: [64, 47], torso: -140, head: -175, arm: { upper: 165, lower: 140 }, leg: { upper: 180, lower: 180 } },
    ],
  },
  "seed-reformer-rowing-from-the-chest": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 3,
    frames: [
      { hip: [56, 47], torso: -90, head: -90, arm: { upper: 90, lower: -70 }, leg: { upper: 0, lower: 0 } },
      { hip: [56, 47], torso: -90, head: -90, arm: { upper: 0, lower: 0 }, leg: { upper: 0, lower: 0 } },
      { hip: [56, 47], torso: -90, head: -90, arm: { upper: -90, lower: -90 }, leg: { upper: 0, lower: 0 } },
    ],
  },
  "seed-reformer-rowing-from-the-hips": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 3,
    frames: [
      { hip: [56, 47], torso: -50, head: -20, arm: { upper: 150, lower: 100 }, leg: { upper: 0, lower: 0 } },
      { hip: [56, 47], torso: -90, head: -90, arm: { upper: 0, lower: 0 }, leg: { upper: 0, lower: 0 } },
      { hip: [56, 47], torso: -90, head: -90, arm: { upper: -90, lower: -90 }, leg: { upper: 0, lower: 0 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Long box, head toward the riser (left).
  // ---------------------------------------------------------------------------
  // Prone, arms reach toward the floor then pull back along the body.
  "seed-reformer-pulling-straps": {
    scene: "box",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 2.8,
    frames: [
      { hip: [62, 35], torso: 180, head: 178, arm: { upper: 160, lower: 160 }, leg: { upper: 0, lower: 0 } },
      { hip: [62, 35], torso: 172, head: -160, arm: { upper: 20, lower: 10 }, leg: { upper: 0, lower: 0 } },
    ],
  },
  // Prone, arms wide in a T then sweeping down to the hips.
  "seed-reformer-t-pull": {
    scene: "box",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 2.6,
    frames: [
      { hip: [62, 35], torso: 180, head: 178, arm: { upper: 120, lower: 110 }, leg: { upper: 0, lower: 0 } },
      { hip: [62, 35], torso: 172, head: -160, arm: { upper: 20, lower: 10 }, leg: { upper: 0, lower: 0 } },
    ],
  },
  // Supine, knees to chest and fists by the temples; reach up, then sweep
  // arms and legs down to a low diagonal with the head curled.
  "seed-reformer-backstroke": {
    scene: "box",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 3,
    frames: [
      { hip: [62, 35], torso: 180, head: 178, arm: { upper: -100, lower: 160 }, leg: { upper: -110, lower: 20 } },
      { hip: [62, 35], torso: 180, head: 178, arm: { upper: -90, lower: -90 }, leg: { upper: -90, lower: -90 } },
      { hip: [62, 35], torso: -172, head: -140, arm: { upper: -20, lower: -20 }, leg: { upper: -30, lower: -30 } },
    ],
  },
  // Lying back with arms overhead, roll up into a Teaser and circle the arms.
  "seed-reformer-teaser-long-box": {
    scene: "box",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 3.2,
    frames: [
      { hip: [62, 35], torso: 180, head: 178, arm: { upper: 180, lower: 180 }, leg: { upper: -35, lower: -35 } },
      { hip: [62, 35], torso: -130, head: -115, arm: { upper: 0, lower: 0 }, leg: { upper: -35, lower: -35 } },
      { hip: [62, 35], torso: -130, head: -115, arm: { upper: -60, lower: -60 }, leg: { upper: -35, lower: -35 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Short box: seated on the box facing the footbar, feet under the strap.
  // ---------------------------------------------------------------------------
  // Hands holding the opposite elbows; tuck and round back in a C curve.
  "seed-reformer-short-box-round": {
    scene: "box",
    caption: "Springs: 2 red (carriage locked)",
    dur: 2.8,
    frames: [
      { hip: [52, 35], torso: -90, head: -90, arm: { upper: 40, lower: 160 }, leg: { upper: 25, lower: 35 } },
      { hip: [52, 35], torso: -45, head: -20, arm: { upper: 40, lower: 160 }, leg: { upper: 25, lower: 35 } },
    ],
  },
  // Flat back hinge from the hips, arms reaching long.
  "seed-reformer-short-box-flat": {
    scene: "box",
    caption: "Springs: 2 red (carriage locked)",
    dur: 2.8,
    frames: [
      { hip: [52, 35], torso: -90, head: -90, arm: { upper: -40, lower: -40 }, leg: { upper: 25, lower: 35 } },
      { hip: [52, 35], torso: -60, head: -60, arm: { upper: -10, lower: -10 }, leg: { upper: 25, lower: 35 } },
    ],
  },
  // Lift and bend the spine to one side and then the other (shown as the
  // lean, arms overhead).
  "seed-reformer-short-box-side-to-side": {
    scene: "box",
    caption: "Springs: 2 red (carriage locked)",
    dur: 3,
    frames: [
      { hip: [52, 35], torso: -70, head: -70, arm: { upper: -50, lower: -50 }, leg: { upper: 25, lower: 35 } },
      { hip: [52, 35], torso: -110, head: -110, arm: { upper: -130, lower: -130 }, leg: { upper: 25, lower: 35 } },
    ],
  },
  // Twist, then hinge back on the diagonal with a long spine.
  "seed-reformer-short-box-twist": {
    scene: "box",
    caption: "Springs: 2 red (carriage locked)",
    dur: 3,
    frames: [
      { hip: [52, 35], torso: -90, head: -90, armL: { upper: -140, lower: -140 }, armR: { upper: -40, lower: -40 }, leg: { upper: 25, lower: 35 } },
      { hip: [52, 35], torso: -60, head: -60, armL: { upper: -120, lower: -120 }, armR: { upper: -15, lower: -15 }, leg: { upper: 25, lower: 35 } },
    ],
  },
  // One foot under the strap, hug the other knee, straighten it, climb the
  // hands up to the ankle, then round back over the box.
  "seed-reformer-short-box-tree": {
    scene: "box",
    caption: "Springs: 2 red (carriage locked)",
    dur: 3.2,
    frames: [
      { hip: [52, 35], torso: -90, head: -90, arm: { upper: 60, lower: 0 }, legL: { upper: -60, lower: 60 }, legR: { upper: 25, lower: 35 } },
      { hip: [52, 35], torso: -90, head: -90, arm: { upper: 20, lower: -20 }, legL: { upper: -60, lower: -60 }, legR: { upper: 25, lower: 35 } },
      { hip: [52, 35], torso: -120, head: -120, arm: { upper: 20, lower: 0 }, legL: { upper: -60, lower: -60 }, legR: { upper: 25, lower: 35 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Stomach massage: seated on the front edge of the carriage, balls of the
  // feet on the footbar.
  // ---------------------------------------------------------------------------
  "seed-reformer-stomach-massage-round": {
    scene: "reformer",
    caption: "Springs: 2 red + 1 blue",
    dur: 2.4,
    frames: [
      { hip: [78, 47], torso: -100, head: -20, arm: { upper: 110, lower: 100 }, leg: { upper: -60, lower: 10 } },
      { hip: [78, 47], torso: -100, head: -20, arm: { upper: 110, lower: 100 }, leg: { upper: -29, lower: -29 } },
    ],
  },
  "seed-reformer-stomach-massage-hands-back": {
    scene: "reformer",
    caption: "Springs: 2 red + 1 blue",
    dur: 2.4,
    frames: [
      { hip: [78, 47], torso: -85, head: -85, arm: { upper: 140, lower: 120 }, leg: { upper: -60, lower: 10 } },
      { hip: [78, 47], torso: -85, head: -85, arm: { upper: 140, lower: 120 }, leg: { upper: -29, lower: -29 } },
    ],
  },
  "seed-reformer-stomach-massage-reach-up": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 2.4,
    frames: [
      { hip: [78, 47], torso: -90, head: -90, arm: { upper: 0, lower: 0 }, leg: { upper: -60, lower: 10 } },
      { hip: [78, 47], torso: -90, head: -90, arm: { upper: -80, lower: -80 }, leg: { upper: -29, lower: -29 } },
    ],
  },
  "seed-reformer-stomach-massage-twist": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 2.6,
    frames: [
      { hip: [78, 47], torso: -90, head: -90, arm: { upper: 0, lower: 0 }, leg: { upper: -60, lower: 10 } },
      { hip: [78, 47], torso: -90, head: -100, armL: { upper: -165, lower: -165 }, armR: { upper: -15, lower: -15 }, leg: { upper: -29, lower: -29 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Standing / kneeling on the carriage with the hands on the footbar.
  // ---------------------------------------------------------------------------
  // Inverted V: heels against the shoulder rests, hips high, head hanging.
  "seed-reformer-elephant": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 2.6,
    frames: [
      { hip: [64, 27], torso: 30, head: 60, arm: { upper: -10, lower: 15 }, leg: { upper: 95, lower: 95 } },
      { hip: [62, 27], torso: 34, head: 60, arm: { upper: -5, lower: 5 }, leg: { upper: 100, lower: 100 } },
    ],
  },
  // Kneeling, chest lifted in a long arc, pressing back and drawing home.
  "seed-reformer-down-stretch": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 2.8,
    frames: [
      { hip: [72, 40], torso: -60, head: -45, arm: { upper: 40, lower: 40 }, leg: { upper: 124, lower: 180 } },
      { hip: [70, 42], torso: -55, head: -40, arm: { upper: 35, lower: 45 }, leg: { upper: 138, lower: 180 } },
    ],
  },
  // Pike with the hips high, then shift forward into a plank and back.
  "seed-reformer-up-stretch": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 2.8,
    frames: [
      { hip: [62, 24], torso: 35, head: 70, arm: { upper: -5, lower: 10 }, leg: { upper: 95, lower: 92 } },
      { hip: [60, 36], torso: -15, head: -10, arm: { upper: 10, lower: 20 }, leg: { upper: 150, lower: 150 } },
    ],
  },
  // Knee stretches: knees on the carriage, feet against the shoulder rests.
  "seed-reformer-knee-stretches-round": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 2,
    frames: [
      { hip: [64, 38], torso: -30, head: 5, arm: { upper: 20, lower: 45 }, leg: { upper: 100, lower: 180 } },
      { hip: [58, 39], torso: -25, head: 5, arm: { upper: 12, lower: 18 }, leg: { upper: 115, lower: 180 } },
    ],
  },
  "seed-reformer-knee-stretches-arched": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 2,
    frames: [
      { hip: [64, 38], torso: -35, head: -60, arm: { upper: 25, lower: 32 }, leg: { upper: 95, lower: 180 } },
      { hip: [58, 39], torso: -30, head: -55, arm: { upper: 10, lower: 20 }, leg: { upper: 110, lower: 180 } },
    ],
  },
  "seed-reformer-knee-stretches-knees-off": {
    scene: "reformer",
    caption: "Springs: 2 red",
    dur: 1.8,
    frames: [
      { hip: [66, 34], torso: -25, head: 10, arm: { upper: 20, lower: 50 }, leg: { upper: 105, lower: 165 } },
      { hip: [60, 36], torso: -20, head: 10, arm: { upper: 8, lower: 25 }, leg: { upper: 115, lower: 170 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Side sitting, lunges and splits.
  // ---------------------------------------------------------------------------
  // Legs folded to one side, near hand on the footbar, outside arm reaches
  // up and over as the carriage presses out.
  "seed-reformer-mermaid": {
    scene: "reformer",
    caption: "Springs: 1 red",
    dur: 3,
    frames: [
      { hip: [80, 45], torso: -90, head: -90, armL: { upper: 100, lower: 100 }, armR: { upper: 30, lower: 33 }, leg: { upper: 170, lower: 15 } },
      { hip: [80, 45], torso: -60, head: -60, armL: { upper: -70, lower: -30 }, armR: { upper: 90, lower: 0 }, leg: { upper: 170, lower: 15 } },
    ],
  },
  // One foot on the carriage, one on the platform by the footbar, arms wide;
  // press out to a wide stance and draw home with the inner thighs.
  "seed-reformer-side-splits": {
    scene: "reformer",
    caption: "Springs: 1 red",
    dur: 3,
    frames: [
      { hip: [78, 31], torso: -90, head: -90, armL: { upper: 180, lower: 180 }, armR: { upper: 0, lower: 0 }, legL: { upper: 124, lower: 124 }, legR: { upper: 56, lower: 56 } },
      { hip: [78, 34], torso: -90, head: -90, armL: { upper: 180, lower: 180 }, armR: { upper: 0, lower: 0 }, legL: { upper: 136, lower: 136 }, legR: { upper: 44, lower: 44 } },
    ],
  },
  // Front foot on the footbar, back foot on the carriage; hands on the bar,
  // then lifted to stand upright in the split.
  "seed-reformer-front-splits": {
    scene: "reformer",
    caption: "Springs: 1 red",
    dur: 3,
    frames: [
      { hip: [74, 33], torso: -40, head: -20, arm: { upper: 50, lower: 75 }, legL: { upper: 135, lower: 135 }, legR: { upper: 10, lower: 10 } },
      { hip: [74, 34], torso: -85, head: -85, arm: { upper: -20, lower: -20 }, legL: { upper: 140, lower: 140 }, legR: { upper: 8, lower: 8 } },
    ],
  },
  // Back knee on the carriage, front foot on the bar; the hips sink forward
  // and down as the carriage presses back.
  "seed-reformer-eves-lunge": {
    scene: "reformer",
    caption: "Springs: 1 red",
    dur: 3,
    frames: [
      { hip: [76, 39], torso: -60, head: -60, arm: { upper: 45, lower: 65 }, legL: { upper: 120, lower: 180 }, legR: { upper: 15, lower: -30 } },
      { hip: [80, 41], torso: -70, head: -70, arm: { upper: 45, lower: 75 }, legL: { upper: 135, lower: 175 }, legR: { upper: 30, lower: -70 } },
    ],
  },
  // Standing leg on the platform, bent; the carriage leg presses back straight.
  "seed-reformer-scooter": {
    scene: "reformer",
    caption: "Springs: 1 red + 1 blue",
    dur: 2,
    frames: [
      { hip: [84, 34], torso: -60, head: -50, arm: { upper: 75, lower: 95 }, legL: { upper: 150, lower: 115 }, legR: { upper: 55, lower: 34 } },
      { hip: [84, 34], torso: -60, head: -50, arm: { upper: 75, lower: 95 }, legL: { upper: 136, lower: 136 }, legR: { upper: 55, lower: 34 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Arm series: kneeling tall on the carriage facing the footbar, straps
  // coming from behind.
  // ---------------------------------------------------------------------------
  "seed-reformer-chest-expansion": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 2.4,
    frames: [
      { hip: [58, 38], torso: -90, head: -90, arm: { upper: 0, lower: 0 }, leg: { upper: 90, lower: 180 } },
      { hip: [58, 38], torso: -90, head: -90, arm: { upper: 120, lower: 120 }, leg: { upper: 90, lower: 180 } },
    ],
  },
  "seed-reformer-bicep-curls": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 2,
    frames: [
      { hip: [58, 38], torso: -90, head: -90, arm: { upper: 10, lower: 10 }, leg: { upper: 90, lower: 180 } },
      { hip: [58, 38], torso: -90, head: -90, arm: { upper: 10, lower: -100 }, leg: { upper: 90, lower: 180 } },
    ],
  },
  // Arms wide (one drawn behind, one in front), then rounded together.
  "seed-reformer-hug-a-tree": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 2.4,
    frames: [
      { hip: [58, 38], torso: -90, head: -90, armL: { upper: 175, lower: 175 }, armR: { upper: 5, lower: 5 }, leg: { upper: 90, lower: 180 } },
      { hip: [58, 38], torso: -90, head: -90, arm: { upper: -10, lower: 20 }, leg: { upper: 90, lower: 180 } },
    ],
  },
  "seed-reformer-serve-a-tray": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 2.2,
    frames: [
      { hip: [58, 38], torso: -90, head: -90, arm: { upper: 90, lower: 0 }, leg: { upper: 90, lower: 180 } },
      { hip: [58, 38], torso: -90, head: -90, arm: { upper: 5, lower: 0 }, leg: { upper: 90, lower: 180 } },
    ],
  },
  // Kneeling tall facing the straps: front raise, then overhead.
  "seed-reformer-kneeling-arm-series": {
    scene: "reformer",
    props: { straps: "hands" },
    caption: "Springs: 1 red",
    dur: 2.8,
    frames: [
      { hip: [60, 38], torso: -90, head: -90, arm: { upper: 105, lower: 100 }, leg: { upper: 90, lower: 0 } },
      { hip: [60, 38], torso: -90, head: -90, arm: { upper: 180, lower: 180 }, leg: { upper: 90, lower: 0 } },
      { hip: [60, 38], torso: -90, head: -90, arm: { upper: -135, lower: -135 }, leg: { upper: 90, lower: 0 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Jumpboard and Star.
  // ---------------------------------------------------------------------------
  // Feet on the board, jump the carriage away with the toes pointed.
  "seed-reformer-jumpboard-basics": {
    scene: "reformer",
    caption: "Springs: 2 red (adjust for body weight)",
    dur: 1.2,
    frames: [
      { hip: [64, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -40, lower: 30 } },
      { hip: [64, 47], torso: 180, head: 175, arm: { upper: 5, lower: 5 }, leg: { upper: -15, lower: -10 } },
    ],
  },
  // Side plank with the bottom hand on the footbar and the feet on the
  // carriage; the top arm and leg lift as the carriage presses out.
  "seed-reformer-star": {
    scene: "reformer",
    caption: "Springs: 1 red + 1 blue",
    dur: 2.6,
    frames: [
      { hip: [70.8, 36.8], torso: -35, head: -35, armL: { upper: -35, lower: -35 }, armR: { upper: 30, lower: 70 }, leg: { upper: -145, lower: -145 } },
      { hip: [66, 37], torso: -30, head: -30, armL: { upper: -105, lower: -105 }, armR: { upper: 20, lower: 60 }, legL: { upper: -95, lower: -95 }, legR: { upper: 147, lower: 147 } },
    ],
  },
};
