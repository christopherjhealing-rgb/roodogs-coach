import type { MovementDiagram } from "./types";

/**
 * Barre diagrams, keyed by seed movement id. The barre post is at x = 12
 * with the bar (end-on) at [12, 26]; the floor is y = 58. A standing
 * figure holding the barre with the left hand: hip near [30, 35],
 * torso -90, armL reaching back toward the bar. Two worked examples.
 */
export const BARRE_DIAGRAMS: Record<string, MovementDiagram> = {
  // Plié in first: standing tall at the barre, bending the knees and
  // returning with the heels together.
  "seed-barre-plie-first-position": {
    scene: "barre",
    dur: 2.4,
    frames: [
      { hip: [30, 35], torso: -90, armL: { upper: 165, lower: 200 }, armR: { upper: 60, lower: 110 }, leg: { upper: 90, lower: 90 } },
      { hip: [30, 41], torso: -90, armL: { upper: 165, lower: 195 }, armR: { upper: 60, lower: 110 }, legL: { upper: 60, lower: 120 }, legR: { upper: 120, lower: 60 } },
    ],
  },
  // Relevé: rising onto the balls of the feet.
  "seed-barre-releve": {
    scene: "barre",
    dur: 2,
    frames: [
      { hip: [30, 35], torso: -90, armL: { upper: 165, lower: 200 }, armR: { upper: 90, lower: 90 }, leg: { upper: 90, lower: 90 } },
      { hip: [30, 32], torso: -90, armL: { upper: 165, lower: 200 }, armR: { upper: 90, lower: 90 }, leg: { upper: 90, lower: 90 } },
    ],
  },
  // ---------------------------------------------------------------------------
  // Warm-up and ballet basics
  // ---------------------------------------------------------------------------

  // Plié in second: a wide turned-out stance, bending the knees out over
  // the toes with the tailbone dropping straight down.
  "seed-barre-plie-second-position": {
    scene: "barre",
    dur: 2.4,
    frames: [
      { hip: [30, 36], torso: -90, armL: { upper: 145, lower: 155 }, armR: { upper: 75, lower: 95 }, legL: { upper: 108, lower: 108 }, legR: { upper: 72, lower: 72 } },
      { hip: [30, 40], torso: -90, armL: { upper: 145, lower: 152 }, armR: { upper: 75, lower: 95 }, legL: { upper: 135, lower: 92 }, legR: { upper: 45, lower: 88 } },
    ],
  },
  // Tendu / dégagé: the working foot brushes forward along the floor, then
  // lifts a few centimetres off it.
  "seed-barre-tendus-degages": {
    scene: "barre",
    dur: 2.6,
    frames: [
      { hip: [30, 35], torso: -90, armL: { upper: 145, lower: 155 }, armR: { upper: 75, lower: 95 }, leg: { upper: 90, lower: 90 } },
      { hip: [30, 35], torso: -90, armL: { upper: 145, lower: 155 }, armR: { upper: 75, lower: 95 }, legL: { upper: 90, lower: 90 }, legR: { upper: 62, lower: 78 } },
      { hip: [30, 35], torso: -90, armL: { upper: 145, lower: 155 }, armR: { upper: 75, lower: 95 }, legL: { upper: 90, lower: 90 }, legR: { upper: 52, lower: 66 } },
    ],
  },
  // Passé balance: toes to the standing knee, rising to relevé, then the
  // barre hand floats free.
  "seed-barre-passe-balance": {
    scene: "barre",
    dur: 3,
    frames: [
      { hip: [30, 35], torso: -90, armL: { upper: 145, lower: 155 }, armR: { upper: 75, lower: 95 }, leg: { upper: 90, lower: 90 } },
      { hip: [30, 32], torso: -90, armL: { upper: 145, lower: 160 }, armR: { upper: 75, lower: 95 }, legL: { upper: 90, lower: 90 }, legR: { upper: 30, lower: 135 } },
      { hip: [30, 32], torso: -90, armL: { upper: 170, lower: 160 }, armR: { upper: 20, lower: 10 }, legL: { upper: 90, lower: 90 }, legR: { upper: 30, lower: 135 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Thighs and seat. "Facing the barre" figures hold the bar with both hands
  // and bend their knees toward it; the working leg reaches away to the right.
  // ---------------------------------------------------------------------------

  // Thigh work, parallel: up on the balls of the feet, then a small knee bend
  // with the heels high and the spine stacked.
  "seed-barre-thigh-work-parallel": {
    scene: "barre",
    dur: 1.4,
    frames: [
      { hip: [28, 32], torso: -90, arm: { upper: 145, lower: 152 }, leg: { upper: 90, lower: 90 } },
      { hip: [28, 35], torso: -90, arm: { upper: 148, lower: 152 }, leg: { upper: 115, lower: 65 } },
    ],
  },
  // Thigh work, turned out: heels together on relevé, knees open wide.
  "seed-barre-thigh-work-turned-out": {
    scene: "barre",
    dur: 1.4,
    frames: [
      { hip: [28, 32], torso: -90, arm: { upper: 145, lower: 152 }, leg: { upper: 90, lower: 90 } },
      { hip: [28, 36], torso: -90, arm: { upper: 148, lower: 152 }, legL: { upper: 120, lower: 60 }, legR: { upper: 60, lower: 120 } },
    ],
  },
  // Chair pose: hips sit back and down away from the barre, arms long.
  "seed-barre-chair-pose-pulses": {
    scene: "barre",
    dur: 1.4,
    frames: [
      { hip: [28, 35], torso: -90, arm: { upper: 145, lower: 152 }, leg: { upper: 90, lower: 90 } },
      { hip: [34, 44], torso: -110, head: -95, arm: { upper: 170, lower: 185 }, leg: { upper: 165, lower: 80 } },
    ],
  },
  // Curtsy lunge: the outside leg crosses behind and both knees bend.
  "seed-barre-curtsy-lunge-pulses": {
    scene: "barre",
    dur: 1.6,
    frames: [
      { hip: [30, 35], torso: -90, armL: { upper: 145, lower: 155 }, armR: { upper: 75, lower: 95 }, leg: { upper: 90, lower: 90 } },
      { hip: [32, 38], torso: -90, armL: { upper: 160, lower: 178 }, armR: { upper: 75, lower: 95 }, legL: { upper: 120, lower: 70 }, legR: { upper: 50, lower: 110 } },
    ],
  },
  // Fold over: forearms on the barre, head heavy, one leg reaching back and
  // lifting from the seat, then bent with the heel pressing up.
  "seed-barre-seat-work-fold-over": {
    scene: "barre",
    dur: 2.6,
    frames: [
      { hip: [43, 35], torso: -160, head: 160, arm: { upper: 200, lower: 105 }, legL: { upper: 90, lower: 90 }, legR: { upper: 10, lower: 5 } },
      { hip: [43, 35], torso: -160, head: 160, arm: { upper: 200, lower: 105 }, legL: { upper: 90, lower: 90 }, legR: { upper: -5, lower: -8 } },
      { hip: [43, 35], torso: -160, head: 160, arm: { upper: 200, lower: 105 }, legL: { upper: 90, lower: 90 }, legR: { upper: 0, lower: -80 } },
    ],
  },
  // Standing glute pulses: band above the knees, standing knee soft, the
  // outside leg reaches back on a diagonal and pulses up.
  "seed-barre-standing-glute-pulses": {
    scene: "barre",
    props: { band: "thighs" },
    dur: 1.2,
    frames: [
      { hip: [28, 35], torso: -90, armL: { upper: 145, lower: 152 }, armR: { upper: 95, lower: 100 }, legL: { upper: 92, lower: 88 }, legR: { upper: 25, lower: 20 } },
      { hip: [28, 35], torso: -90, armL: { upper: 145, lower: 152 }, armR: { upper: 95, lower: 100 }, legL: { upper: 92, lower: 88 }, legR: { upper: 15, lower: 10 } },
    ],
  },
  // Pretzel: seated with the front leg folded in front and the back leg bent
  // behind; the back knee and foot lift off the mat.
  "seed-barre-pretzel": {
    scene: "floor",
    dur: 1.6,
    frames: [
      { hip: [55, 54], torso: -82, arm: { upper: 85, lower: 95 }, legL: { upper: 175, lower: 200 }, legR: { upper: -10, lower: 150 } },
      { hip: [55, 54], torso: -82, arm: { upper: 85, lower: 95 }, legL: { upper: 162, lower: 190 }, legR: { upper: -10, lower: 150 } },
    ],
  },
  // Attitude: the working leg lifts behind with the knee bent and turned out.
  "seed-barre-attitude": {
    scene: "barre",
    dur: 1.6,
    frames: [
      { hip: [28, 35], torso: -95, armL: { upper: 145, lower: 152 }, armR: { upper: 95, lower: 100 }, legL: { upper: 90, lower: 90 }, legR: { upper: 30, lower: -40 } },
      { hip: [28, 35], torso: -95, armL: { upper: 145, lower: 152 }, armR: { upper: 95, lower: 100 }, legL: { upper: 90, lower: 90 }, legR: { upper: 15, lower: -50 } },
    ],
  },
  // Arabesque: both hands on the barre, the straight leg lifts behind with a
  // slight forward hinge from the hips.
  "seed-barre-arabesque-lifts": {
    scene: "barre",
    dur: 1.8,
    frames: [
      { hip: [28, 35], torso: -95, arm: { upper: 145, lower: 152 }, legL: { upper: 90, lower: 90 }, legR: { upper: 10, lower: 5 } },
      { hip: [28, 35], torso: -105, head: -95, arm: { upper: 150, lower: 158 }, legL: { upper: 90, lower: 90 }, legR: { upper: -10, lower: -12 } },
    ],
  },
  // Waterski: arms long on the barre, hinging back like a waterskier with the
  // knees bent, then pulsing the hips forward.
  "seed-barre-waterski": {
    scene: "barre",
    dur: 1.4,
    frames: [
      { hip: [19, 36], torso: -62, head: -75, arm: { upper: 160, lower: 160 }, leg: { upper: 105, lower: 78 } },
      { hip: [17, 36], torso: -68, head: -80, arm: { upper: 165, lower: 165 }, leg: { upper: 110, lower: 72 } },
    ],
  },
  // Calf raises: facing the barre, rising onto the balls of the feet.
  "seed-barre-calf-raises": {
    scene: "barre",
    dur: 2,
    frames: [
      { hip: [28, 35], torso: -90, arm: { upper: 145, lower: 152 }, leg: { upper: 90, lower: 90 } },
      { hip: [28, 32], torso: -90, arm: { upper: 145, lower: 158 }, leg: { upper: 90, lower: 90 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Upper body
  // ---------------------------------------------------------------------------

  // Push-ups: hands on the barre, one long line from head to heel, lowering the
  // chest toward the bar with the elbows tucked.
  "seed-barre-push-ups": {
    scene: "barre",
    dur: 2,
    frames: [
      { hip: [37.7, 36.1], torso: -115, arm: { upper: 155, lower: 155 }, leg: { upper: 65, lower: 65 } },
      { hip: [34.2, 38.1], torso: -125, arm: { upper: 109, lower: 215 }, leg: { upper: 55, lower: 55 } },
    ],
  },
  // Biceps: elbows pinned by the ribs, curling the weights to the shoulders.
  "seed-barre-arms-biceps": {
    scene: "floor",
    props: { weights: true },
    dur: 1.8,
    frames: [
      { hip: [50, 35], torso: -90, arm: { upper: 75, lower: 80 }, leg: { upper: 90, lower: 90 } },
      { hip: [50, 35], torso: -90, arm: { upper: 75, lower: -60 }, leg: { upper: 90, lower: 90 } },
    ],
  },
  // Triceps: hinged forward with soft knees, elbows lifted behind the ribs,
  // extending the arms straight back.
  "seed-barre-arms-triceps": {
    scene: "floor",
    props: { weights: true },
    dur: 1.6,
    frames: [
      { hip: [50, 35], torso: -60, head: -50, arm: { upper: 160, lower: 90 }, leg: { upper: 95, lower: 85 } },
      { hip: [50, 35], torso: -60, head: -50, arm: { upper: 160, lower: 160 }, leg: { upper: 95, lower: 85 } },
    ],
  },
  // Shoulder press: weights at the shoulders, pressing up beside the ears
  // (drawn on a diagonal so the arms stay inside the picture).
  "seed-barre-arms-shoulder-press": {
    scene: "floor",
    props: { weights: true },
    dur: 1.8,
    frames: [
      { hip: [50, 35], torso: -90, arm: { upper: 45, lower: -100 }, leg: { upper: 90, lower: 90 } },
      { hip: [50, 35], torso: -90, arm: { upper: -35, lower: -50 }, leg: { upper: 90, lower: 90 } },
    ],
  },
  // Lateral raise pulses: arms lift to shoulder height (shown reaching
  // forward in profile), lower halfway and lift again.
  "seed-barre-arms-lateral-raise-pulses": {
    scene: "floor",
    props: { weights: true },
    dur: 1.2,
    frames: [
      { hip: [50, 35], torso: -90, arm: { upper: 40, lower: 45 }, leg: { upper: 90, lower: 90 } },
      { hip: [50, 35], torso: -90, arm: { upper: 0, lower: 5 }, leg: { upper: 90, lower: 90 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  // Tuck series: back to the barre, holding it behind, feet forward with soft
  // knees, tucking the pelvis under and releasing.
  "seed-barre-core-tuck-series": {
    scene: "barre",
    dur: 1.6,
    frames: [
      { hip: [24, 36], torso: -90, arm: { upper: 130, lower: 170 }, leg: { upper: 70, lower: 100 } },
      { hip: [26, 36], torso: -98, head: -90, arm: { upper: 135, lower: 172 }, leg: { upper: 65, lower: 105 } },
    ],
  },
  // Round-back series: leaning back into a ball behind the lower back in a
  // C curve, lifting one foot and reaching the arms overhead.
  "seed-barre-round-back-abdominal-series": {
    scene: "floor",
    props: { ball: [50, 50] },
    dur: 2.4,
    frames: [
      { hip: [58, 54], torso: -120, head: -100, arm: { upper: 0, lower: -10 }, leg: { upper: -30, lower: 68 } },
      { hip: [58, 54], torso: -120, head: -100, arm: { upper: -110, lower: -110 }, legL: { upper: -30, lower: 68 }, legR: { upper: -30, lower: 0 } },
    ],
  },
  // Seated core with ring: balancing behind the sitting bones with a long
  // spine, squeezing the ring between the hands.
  "seed-barre-seated-core-with-ring": {
    scene: "floor",
    props: { ring: "hands" },
    dur: 1.6,
    frames: [
      { hip: [58, 54], torso: -105, head: -95, arm: { upper: -10, lower: -15 }, leg: { upper: -30, lower: 68 } },
      { hip: [58, 54], torso: -120, head: -105, arm: { upper: -20, lower: -25 }, leg: { upper: -30, lower: 68 } },
    ],
  },
  // Bridge with ball: supine, ball squeezed between the knees, lifting the
  // hips and pulsing.
  "seed-barre-bridge-with-ball": {
    scene: "floor",
    props: { ball: "knees" },
    dur: 2,
    frames: [
      { hip: [58, 54], torso: 180, head: 180, arm: { upper: 10, lower: 0 }, leg: { upper: -50, lower: 75 } },
      { hip: [58, 46], torso: 156, head: 180, arm: { upper: 10, lower: 0 }, leg: { upper: -15, lower: 95 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // Stretch
  // ---------------------------------------------------------------------------

  // Hamstring stretch: heel resting on the barre with the leg straight, then
  // hinging forward from the hips with a flat back.
  "seed-barre-hamstring-stretch-at-barre": {
    scene: "barre",
    dur: 3.2,
    frames: [
      { hip: [34, 35], torso: -100, arm: { upper: 140, lower: 150 }, legL: { upper: 90, lower: 90 }, legR: { upper: 158, lower: 160 } },
      { hip: [34, 35], torso: -125, head: -115, arm: { upper: 120, lower: 110 }, legL: { upper: 90, lower: 90 }, legR: { upper: 158, lower: 160 } },
    ],
  },
  // Hip flexor lunge: one hand on the barre, back knee down in a long lunge,
  // then the hips shift forward as the free arm reaches overhead.
  "seed-barre-hip-flexor-lunge-stretch": {
    scene: "barre",
    dur: 3.2,
    frames: [
      { hip: [32, 47], torso: -90, armL: { upper: 165, lower: 185 }, armR: { upper: 80, lower: 85 }, legL: { upper: 115, lower: 180 }, legR: { upper: 0, lower: 90 } },
      { hip: [34, 46.5], torso: -95, armL: { upper: 160, lower: 185 }, armR: { upper: -60, lower: -75 }, legL: { upper: 120, lower: 180 }, legR: { upper: 5, lower: 95 } },
    ],
  },
};
