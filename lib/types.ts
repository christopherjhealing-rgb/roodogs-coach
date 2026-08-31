// Core entities for Roodogs Coach. All dates are ISO strings, all times epoch ms.

export type DrillTag =
  | "passing"
  | "tackling"
  | "evasion"
  | "rucking"
  | "fitness"
  | "fun"
  | "warmup"
  | "setpiece"
  | "kicking";

/** Rugby positional group. */
export type PlayerUnit = "forwards" | "backs";

export interface Player {
  id: string;
  name: string;
  notes: string;
  /** Jersey number, optional. */
  jersey?: number;
  /** Free-text position, e.g. "Fly-half", "Prop". */
  position?: string;
  /** Forwards or backs. */
  unit?: PlayerUnit;
  /** Manual roster position; unset players sort by jersey then name. */
  order?: number;
  /** Soft delete: archived players keep their history but leave the roster. */
  active: boolean;
}

/** Which squads a library drill suits as written. */
export type DrillLevel = "u9" | "mod" | "older";

export interface Drill {
  id: string;
  name: string;
  tags: DrillTag[];
  durationMins: number;
  equipment: string;
  description: string;
  /** Optional whiteboard diagram for this drill. */
  boardId?: string;
  /** How to tone the drill down for kids finding it hard. */
  easier?: string;
  /** How to stretch the kids who've got it. */
  harder?: string;
  // --- library drills (lib/seedDrillsKit.ts) carry these extras ---
  /** Animated diagram spec string, rendered by components/drills/DrillDiagram. */
  diagramSpec?: string;
  /** Coaching cues / key points. */
  cues?: string;
  /** Players needed, e.g. "5" or "Any". */
  players?: string;
  /** Playing area, e.g. "15m x 20m". */
  area?: string;
  /** Cone-set label override for grouping drills that share a setup;
   *  derived from `area` when unset (see lib/coneSetup.ts). */
  setup?: string;
  /** How age-appropriate as written. */
  level?: DrillLevel;
  /** Where the drill came from. */
  source?: string;
  sourceUrl?: string;
}

export interface Session {
  id: string;
  date: string;
  drillIds: string[];
  notes: string;
  /** Roll call — players who made it to training. */
  attendeeIds?: string[];
}

export type MatchStatus = "setup" | "live" | "finished";

/** A stretch of real time during which the game clock was running
 *  (kick-off/resume through to pause/full-time). Open while live. */
export interface ClockPeriod {
  startMs: number;
  endMs?: number;
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  halfLengthMins: number;
  result?: string;
  status: MatchStatus;
  /** Players at the game today; defaults to the active roster. */
  squadIds?: string[];
  /** Clock bookkeeping — game time is computed from event overlap with
   *  these periods, so halftime never counts toward anyone's minutes. */
  clockPeriods?: ClockPeriod[];
  /** Positive-only award picked after full-time (legacy — Player of the day
   *  now also lives in `awards.player`; read both for older matches). */
  playerOfMatchId?: string;
  /** Post-match awards: award id (see lib/awards.ts) → player id. */
  awards?: Record<string, string>;
}

export type MatchEventType =
  | "sub_on"
  | "sub_off"
  | "try"
  | "tackle"
  /** Won a turnover / stole the ball. */
  | "steal"
  /** Lost the ball (knock-on, stripped, forward pass). */
  | "lost";

/** What a whiteboard diagram is for. */
export type BoardKind = "drill" | "game" | "set_play";

export type TokenType =
  | "player"
  | "opponent"
  | "dad"
  | "cone"
  | "hurdle"
  | "bag"
  /** Flat hit/tackle pad (shield) — different bit of kit to the bag. */
  | "pad"
  | "ball";

export type MovementType =
  | "run"
  | "pass"
  | "kick"
  | "tackle"
  | "jump"
  /** Freehand pen — a plain drawn line with no arrowhead. */
  | "draw";

/** A thing placed on the whiteboard. Coordinates are in pitch units
 *  (0–100 across, 0–140 down), not pixels. */
export interface BoardToken {
  id: string;
  type: TokenType;
  x: number;
  y: number;
  label?: string;
  /** Fill colour override — currently used for cones. */
  color?: string;
}

/** A movement arrow drawn on the whiteboard, start to finish. */
export interface BoardMovement {
  id: string;
  type: MovementType;
  points: { x: number; y: number }[];
}

/** A distance marker: a dimension line between two points, labelled in
 *  metres based on the board's real-world width. */
export interface BoardMeasure {
  id: string;
  a: { x: number; y: number };
  b: { x: number; y: number };
}

export interface Board {
  id: string;
  name: string;
  kind: BoardKind;
  tokens: BoardToken[];
  movements: BoardMovement[];
  /** Distance markers (measure tool). */
  measures?: BoardMeasure[];
  /** Real-world width of the drawn area in metres (defaults to 40). */
  widthM?: number;
  updatedMs: number;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  playerId: string;
  type: MatchEventType;
  timestampMs: number;
}
