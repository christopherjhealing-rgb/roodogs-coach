/**
 * Movement diagrams are described as stick-figure poses and rendered to
 * SVG by `poseSvg.ts`. One spec per seed movement, keyed by movement id.
 *
 * Coordinate system: a 120 x 70 box, x to the right, y DOWN. The floor
 * sits at y = 58 (mat / floor scenes) or the carriage top at y = 50
 * (reformer). Angles are absolute, in degrees, measured from the +x axis
 * with clockwise positive because y points down:
 *
 *      -90 = straight up      0 = to the right (the figure's front)
 *       90 = straight down  180 = to the left (behind the figure)
 *
 * Every limb angle is the direction the segment points AWAY from the body:
 * upper arm from shoulder to elbow, forearm from elbow to wrist, thigh from
 * hip to knee, shin from knee to ankle. Torso is hip -> shoulder, so an
 * upright figure has torso -90 and a supine figure (lying on the back,
 * head to the left) has torso 180 with legs pointing 0.
 */

export type Limb = { upper: number; lower: number };

export interface Pose {
  /** Hip joint position. */
  hip: [number, number];
  /** Hip -> shoulder direction. Upright = -90. */
  torso: number;
  /** Neck -> head direction. Defaults to the torso angle. */
  head?: number;
  /** Both arms unless armL / armR override. */
  arm?: Limb;
  armL?: Limb;
  armR?: Limb;
  /** Both legs unless legL / legR override. */
  leg?: Limb;
  legL?: Limb;
  legR?: Limb;
}

export type Scene = "mat" | "reformer" | "barre" | "floor" | "box";

export interface Props {
  /** Small ball: between the hands, between the knees, under the hips/back, or an explicit point. */
  ball?: "hands" | "knees" | "back" | "feet" | [number, number];
  /** Pilates ring: held between the hands, between the ankles, or an explicit point. */
  ring?: "hands" | "ankles" | [number, number];
  /** Resistance band: looped feet to hands, or around the thighs. */
  band?: "feet-hands" | "thighs";
  /** Light hand weights drawn at the wrists. */
  weights?: boolean;
  /** Reformer straps drawn from the riser to the hands or feet. */
  straps?: "hands" | "feet";
}

export interface MovementDiagram {
  scene: Scene;
  props?: Props;
  /** 1 to 3 key poses. More than one animates back and forth between them. */
  frames: Pose[];
  /** Seconds for one full cycle; default 2.6. */
  dur?: number;
  /** Optional one-line caption under the figure, e.g. "Springs: 2 red". */
  caption?: string;
}
