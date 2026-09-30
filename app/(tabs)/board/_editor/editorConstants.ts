// Constants, types and small pure helpers for the board editor. Moved out
// of page.tsx so the page holds the editor's behaviour, not its tables.

import type {
  BoardMeasure,
  BoardMovement,
  BoardToken,
  MovementType,
  TokenType,
} from "@/lib/types";
import { PITCH_W, snapToGrid } from "../BoardCanvas";

/** How close a tap has to land to an arrow, in pitch units, to count as
 *  "on" it while a drawing tool is active. The arrow's hit band is much
 *  fatter than this so it's easy to grab in Move mode; in Draw mode we want
 *  a near miss to start a new arrow rather than grab the old one. */
export const DRAW_MODE_GRAB_UNITS = 2.5;

export type Mode =
  | { kind: "move" }
  | { kind: "erase" }
  | { kind: "measure" }
  | { kind: "place"; token: TokenType }
  | { kind: "draw"; movement: MovementType };

/** Unified selection — any mix of tokens, arrows and distance markers. */
export interface Selection {
  tokens: string[];
  movements: string[];
  measures: string[];
}

export const selTokens = (ids: string[]): Selection => ({
  tokens: ids,
  movements: [],
  measures: [],
});
export const selMovements = (ids: string[]): Selection => ({
  tokens: [],
  movements: ids,
  measures: [],
});
export const selMeasures = (ids: string[]): Selection => ({
  tokens: [],
  movements: [],
  measures: ids,
});
export const selCount = (s: Selection | null): number =>
  s ? s.tokens.length + s.movements.length + s.measures.length : 0;

// Toolbar groups — collapsed into dropdowns so the whole palette fits on a
// phone without sideways scrolling.
export const PEOPLE_TOKENS: TokenType[] = ["player", "opponent", "dad"];
export const EQUIP_TOKENS: TokenType[] = ["cone", "hurdle", "bag", "pad", "ball"];

export const MOVEMENT_TYPES: MovementType[] = [
  "run",
  "pass",
  "kick",
  "tackle",
  "jump",
  "draw",
];

export const PLAYER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Tightest the frame can close in, as a multiple of the whole board. */
export const MAX_ZOOM = 6;
/** How much one tap of the zoom buttons changes the frame. */
export const ZOOM_STEP = 1.4;

/** Token size presets. 1 is the size the board has always drawn at. */
export const ICON_SIZES: { label: string; scale: number }[] = [
  { label: "XS", scale: 0.55 },
  { label: "S", scale: 0.75 },
  { label: "M", scale: 1 },
  { label: "L", scale: 1.3 },
];

export interface Snapshot {
  tokens: BoardToken[];
  movements: BoardMovement[];
  measures: BoardMeasure[];
  // the board's shape and icon size are undoable too
  widthM?: number;
  lengthM?: number;
  iconScale?: number;
}

export type Pt = { x: number; y: number };

/** With grid lock on, an arrow's end lands on the nearest grid point —
 *  any grid point, so a pass can go cone to cone at whatever angle the
 *  cones make. (An earlier version forced the eight compass directions,
 *  which looked tidy and stopped exactly that.) */
export function gridPoint(p: Pt, step: number, h: number): Pt {
  return {
    x: Math.min(PITCH_W, Math.max(0, snapToGrid(p.x, step))),
    y: Math.min(h, Math.max(0, snapToGrid(p.y, step))),
  };
}
