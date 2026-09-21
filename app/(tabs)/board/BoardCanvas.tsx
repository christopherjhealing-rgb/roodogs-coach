"use client";

import type {
  Board,
  BoardKind,
  BoardMovement,
  BoardToken,
  ConeShape,
  MovementType,
  PlayerRole,
  TokenType,
} from "@/lib/types";

// Pitch coordinate space — everything on a board is stored in these units.
export const PITCH_W = 100;
export const PITCH_H = 140;

// Arrow palette, matched to the drill-library diagrams (dark ink runs, brass
// passes, muted kicks, red contact) so both read as one design on a light board.
export const MOVEMENT_STYLE: Record<
  MovementType,
  { color: string; dash?: string; label: string }
> = {
  run: { color: "#12332A", label: "Run" },
  pass: { color: "#D3571B", dash: "3 2", label: "Pass" },
  kick: { color: "#5B6878", dash: "1.5 2.4", label: "Kick" },
  tackle: { color: "#C8102E", label: "Tackle" },
  jump: { color: "#7c3aed", dash: "3 2", label: "Jump" },
  draw: { color: "#b45309", label: "Pen" },
};

export const TOKEN_LABELS: Record<TokenType, string> = {
  player: "Player",
  opponent: "Defender",
  dad: "Dad",
  cone: "Cone",
  hurdle: "Hurdle",
  bag: "Tackle bag",
  pad: "Hit pad",
  ball: "Ball",
};

/** Cone colour choices shown when the cone tool is selected. */
export const CONE_COLORS: { fill: string; stroke: string; name: string }[] = [
  { fill: "#fb923c", stroke: "#ea580c", name: "Orange" },
  { fill: "#facc15", stroke: "#ca8a04", name: "Yellow" },
  { fill: "#ef4444", stroke: "#b91c1c", name: "Red" },
  { fill: "#3b82f6", stroke: "#1d4ed8", name: "Blue" },
  { fill: "#22c55e", stroke: "#15803d", name: "Green" },
  // black replaces white, which vanished on the light board
  { fill: "#292524", stroke: "#0c0a09", name: "Black" },
];

function coneStroke(fill: string): string {
  return CONE_COLORS.find((c) => c.fill === fill)?.stroke ?? "#ea580c";
}

/**
 * Disc shades for a player's place in a sequence. The first is the brand's
 * deep green — darker than the old solid — and each step lightens, so a
 * move drawn five deep still reads first → last. Text goes dark once the
 * disc is too pale for white.
 */
export const PLAYER_SHADES: { fill: string; stroke: string; text: string }[] = [
  { fill: "#12332A", stroke: "#081a14", text: "#ffffff" },
  { fill: "#1E5B3C", stroke: "#12332A", text: "#ffffff" },
  { fill: "#3E8A61", stroke: "#1E5B3C", text: "#ffffff" },
  { fill: "#6FB38E", stroke: "#1E5B3C", text: "#12332A" },
  { fill: "#A6D3BA", stroke: "#1E5B3C", text: "#12332A" },
  { fill: "#D3EBDC", stroke: "#1E5B3C", text: "#12332A" },
];

/**
 * Which repeat each numbered player is, in placement order: the first token
 * with a given number is 0, the next with the same number 1, and so on.
 * Derived, never stored, so deleting the first 7 promotes the second to
 * solid on its own. Unnumbered players and other token types are skipped.
 */
export function playerRepeatIndex(
  tokens: readonly BoardToken[]
): Map<string, number> {
  const seen = new Map<string, number>();
  const out = new Map<string, number>();
  for (const t of tokens) {
    if (t.type !== "player" || !t.label) continue;
    const k = seen.get(t.label) ?? 0;
    out.set(t.id, k);
    seen.set(t.label, k + 1);
  }
  return out;
}

/**
 * Role colours for players — bold primaries, as the coach asked, so a
 * breakdown or a passing move reads across the paddock. Anchor green,
 * runner blue, passer orange, catcher magenta, tackler yellow, jackler
 * purple, been-tackled red. Red also means the opposition's discs; the
 * coach chose it for "tackled" knowingly.
 */
export const PLAYER_ROLES: {
  role: PlayerRole;
  label: string;
  fill: string;
  stroke: string;
  text: string;
}[] = [
  { role: "anchor", label: "Anchor", fill: "#22c55e", stroke: "#15803d", text: "#052e16" },
  { role: "runner", label: "Runner", fill: "#2563eb", stroke: "#1e3a8a", text: "#ffffff" },
  { role: "passer", label: "Passer", fill: "#f97316", stroke: "#c2410c", text: "#431407" },
  { role: "catcher", label: "Catcher", fill: "#db2777", stroke: "#9d174d", text: "#ffffff" },
  { role: "tackler", label: "Tackler", fill: "#eab308", stroke: "#a16207", text: "#422006" },
  { role: "jackler", label: "Jackler", fill: "#7c3aed", stroke: "#4c1d95", text: "#ffffff" },
  { role: "tackled", label: "Been tackled", fill: "#dc2626", stroke: "#991b1b", text: "#ffffff" },
];

/** Pen stroke widths, in pitch units. Medium is the arrows' own weight. */
export const PEN_WIDTHS: { label: string; width: number }[] = [
  { label: "Thin", width: 0.7 },
  { label: "Medium", width: 1.1 },
  { label: "Thick", width: 2.2 },
];

/** The marker shapes a cone can take, in picker order. */
export const CONE_SHAPES: { shape: ConeShape; label: string }[] = [
  { shape: "triangle", label: "Cone" },
  { shape: "circle", label: "Disc" },
  { shape: "square", label: "Square" },
];

/** The drawn outline of a cone marker, centred on the origin. Shared by the
 *  board glyph and the shape picker so they can't drift apart. */
export function ConeMarker({
  shape = "triangle",
  fill,
}: {
  shape?: ConeShape;
  fill: string;
}) {
  const common = {
    fill,
    stroke: coneStroke(fill),
    strokeWidth: 0.4,
    strokeLinejoin: "round" as const,
  };
  switch (shape) {
    case "circle":
      // flat disc marker
      return <circle r={2.3} {...common} />;
    case "square":
      return <rect x={-2.2} y={-2.2} width={4.4} height={4.4} rx={0.4} {...common} />;
    default:
      // upright marker cone — matches the drill diagrams
      return <path d="M -2.4 2.3 L 2.4 2.3 L 0 -2.6 Z" {...common} />;
  }
}

export type Surface = "pitch" | "plain";

/** Snap v to a grid of the given step (pitch units); falsy step = no snap. */
/**
 * Grid-lock steps in metres. Every step is a whole multiple of the one
 * below it, so a cone snapped on one grid still sits on an intersection of
 * every finer grid — changing the step never strands what's already down.
 *
 * The finest step is 0.5 m rather than 1 m because 2.5 m has to sit in the
 * ladder (it's the coach's half-channel spacing) and 2.5 isn't a whole
 * multiple of 1. Half a metre still lands every odd width in the drill
 * library exactly — a 3 m channel is six steps, a 2 m one four.
 *
 * The bigger numbers follow the library, where areas are overwhelmingly
 * multiples of 5 and 10 — 10 m (31 drills), 20 m (26), 15 m (21), 5 m (16).
 */
export const GRID_STEPS_M = [0.5, 2.5, 5, 10];

/** The step the grid starts on. Grid lock is on by default at this. */
export const DEFAULT_GRID_STEP_M = 2.5;

export function snapToGrid(v: number, step: number | false): number {
  return step ? Math.round(v / step) * step : v;
}

/** Total polyline length of a point list, in pitch units. */
export function pathLengthUnits(pts: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return total;
}

/** Pitch-unit length → metre label, e.g. "7.5 m" (0.5 m steps under 10 m). */
export function formatMetres(units: number, widthM: number): string {
  const meters = (units / PITCH_W) * widthM;
  const value = meters >= 10 ? Math.round(meters) : Math.round(meters * 2) / 2;
  return `${value} m`;
}

/** Drills use a plain training field; set plays and games use a full pitch. */
export function surfaceFor(board: { kind: BoardKind }): Surface {
  return board.kind === "drill" ? "plain" : "pitch";
}

export const DEFAULT_WIDTH_M = 40;
/** Length:width of the original fixed board, kept as the default shape. */
const DEFAULT_RATIO = PITCH_H / PITCH_W;

type Sized = { widthM?: number; lengthM?: number; iconScale?: number };

export function boardWidthM(b: Sized): number {
  return b.widthM && b.widthM > 0 ? b.widthM : DEFAULT_WIDTH_M;
}

export function boardLengthM(b: Sized): number {
  return b.lengthM && b.lengthM > 0
    ? b.lengthM
    : boardWidthM(b) * DEFAULT_RATIO;
}

/**
 * Height of the drawing area in pitch units. The horizontal scale is fixed
 * (PITCH_W units = widthM metres) so metres stay square in both directions;
 * the length just makes the board taller or shorter. Defaults to PITCH_H.
 *
 * The bounds are pure defence against nonsense stored data — they sit well
 * outside anything the size inputs allow, so a real shape (a 3 m × 20 m
 * channel, say) is never squashed out of proportion.
 */
export function pitchHeight(b: Sized): number {
  const h = (PITCH_W * boardLengthM(b)) / boardWidthM(b);
  return Math.max(20, Math.min(2000, Math.round(h * 10) / 10));
}

/** Token size multiplier for a board (1 = standard). */
export function iconScaleOf(b: Sized): number {
  const s = b.iconScale;
  return s && s > 0 ? Math.max(0.3, Math.min(2, s)) : 1;
}

function GridLines({ step, h }: { step: number; h: number }) {
  const lines = [];
  for (let x = step; x < PITCH_W; x += step)
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke="#1E5B3C" strokeWidth={0.22} opacity={0.14} />
    );
  for (let y = step; y < h; y += step)
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={PITCH_W} y2={y} stroke="#1E5B3C" strokeWidth={0.22} opacity={0.14} />
    );
  return <g>{lines}</g>;
}

// Light tactical-board palette, matched to the drill-library diagrams.
const SURFACE_BG = "#f2f5ef";
const BOARD_LINE = "#2F6B3A"; // try / boundary
const BOARD_MUTED = "#5B6878";

export function Pitch({
  variant = "pitch",
  grid = 0,
  h = PITCH_H,
}: {
  variant?: Surface;
  /** Grid line spacing in pitch units; 0/undefined hides the grid. */
  grid?: number;
  /** Board height in pitch units (see pitchHeight). */
  h?: number;
}) {
  // full-pitch markings only make sense on a board long enough to hold them
  const marked = variant === "pitch" && h >= 60;
  return (
    <g>
      {/* light tactical board with a dashed boundary, like the drill diagrams */}
      <rect x={0} y={0} width={PITCH_W} height={h} fill={SURFACE_BG} />
      <rect
        x={2}
        y={2}
        width={PITCH_W - 4}
        height={h - 4}
        fill="none"
        stroke={BOARD_LINE}
        strokeWidth={0.5}
        strokeDasharray="2.5 2"
        opacity={0.5}
      />
      {marked && (
        <>
          {/* try lines */}
          <line x1={2} y1={14} x2={PITCH_W - 2} y2={14} stroke={BOARD_LINE} strokeWidth={0.9} />
          <line x1={2} y1={h - 14} x2={PITCH_W - 2} y2={h - 14} stroke={BOARD_LINE} strokeWidth={0.9} />
          {/* halfway */}
          <line x1={2} y1={h / 2} x2={PITCH_W - 2} y2={h / 2} stroke={BOARD_MUTED} strokeWidth={0.4} opacity={0.5} />
          {/* dashed lines either side of halfway */}
          <line x1={2} y1={42} x2={PITCH_W - 2} y2={42} stroke={BOARD_MUTED} strokeWidth={0.35} strokeDasharray="2 2" opacity={0.4} />
          <line x1={2} y1={h - 42} x2={PITCH_W - 2} y2={h - 42} stroke={BOARD_MUTED} strokeWidth={0.35} strokeDasharray="2 2" opacity={0.4} />
        </>
      )}
      {grid > 0 && <GridLines step={grid} h={h} />}
    </g>
  );
}

/** A board token, drawn at the origin. `scale` shrinks/grows the glyph
 *  without moving it (see Board.iconScale). `screenDelta` is how far the
 *  board itself has been turned, so lettering can be kept upright. */
export function TokenGlyph({
  token,
  scale = 1,
  screenDelta = 0,
  repeat = 0,
}: {
  token: BoardToken;
  scale?: number;
  screenDelta?: number;
  /** Which repeat of this player number it is (see playerRepeatIndex). */
  repeat?: number;
}) {
  const shape = (
    <TokenShape token={token} screenDelta={screenDelta} repeat={repeat} />
  );
  return scale === 1 ? shape : <g transform={`scale(${scale})`}>{shape}</g>;
}

/** Keeps a label the right way up on a turned board. Shapes rotate with the
 *  pitch the way cones would on a real one; only the lettering is spun back,
 *  because sideways numbers can't be read at a glance. */
function Upright({
  screenDelta,
  children,
}: {
  screenDelta: number;
  children: React.ReactNode;
}) {
  if (!screenDelta) return <>{children}</>;
  return <g transform={`rotate(${-screenDelta})`}>{children}</g>;
}

function TokenShape({
  token,
  screenDelta = 0,
  repeat = 0,
}: {
  token: BoardToken;
  screenDelta?: number;
  repeat?: number;
}) {
  switch (token.type) {
    case "player": {
      // seal-green disc with a white number — matches the drill attackers;
      // a repeated number steps down the shade ramp
      // a role sets the colour outright; otherwise repeats step down the ramp
      const role = token.role && PLAYER_ROLES.find((r) => r.role === token.role);
      // a sequence set by hand beats the one worked out from placement order
      const step = token.seq ?? repeat;
      const shade =
        role ?? PLAYER_SHADES[Math.min(step, PLAYER_SHADES.length - 1)];
      // "SH" fits at full size; a three-letter label needs to come down a notch
      const fontSize = (token.label?.length ?? 0) > 2 ? 2.4 : 3.3;
      return (
        <g>
          <circle r={3.4} fill={shade.fill} stroke={shade.stroke} strokeWidth={0.5} />
          {token.label && (
            <Upright screenDelta={screenDelta}>
              <text
                textAnchor="middle"
                dy={fontSize === 3.3 ? 1.2 : 0.9}
                fontSize={fontSize}
                fontWeight={700}
                fill={shade.text}
              >
                {token.label}
              </text>
            </Upright>
          )}
        </g>
      );
    }
    case "opponent":
      // red disc — matches the drill defenders
      return (
        <circle r={3.2} fill="#C8102E" stroke="#8a0b20" strokeWidth={0.5} />
      );
    case "dad":
      // parent helper — bigger than the kids, friendly hat silhouette
      return (
        <g>
          <circle r={4.2} fill="#44403c" stroke="#1c1917" strokeWidth={0.6} />
          <path
            d="M -2.6 -1.4 A 2.6 2.6 0 0 1 2.6 -1.4 Z"
            fill="#f5f5f4"
          />
          <rect x={-3.4} y={-1.5} width={6.8} height={0.9} rx={0.45} fill="#f5f5f4" />
          <Upright screenDelta={screenDelta}>
            <text
              textAnchor="middle"
              dy={3.2}
              fontSize={2.6}
              fontWeight={700}
              fill="#f5f5f4"
            >
              D
            </text>
          </Upright>
        </g>
      );
    case "cone":
      return (
        <ConeMarker shape={token.shape} fill={token.color ?? "#fb923c"} />
      );
    case "hurdle":
      return (
        <rect
          x={-3.4}
          y={-1}
          width={6.8}
          height={2}
          rx={0.6}
          fill="#facc15"
          stroke="#ca8a04"
          strokeWidth={0.4}
        />
      );
    case "bag":
      return (
        <rect
          x={-1.7}
          y={-3.4}
          width={3.4}
          height={6.8}
          rx={1.5}
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth={0.4}
        />
      );
    case "pad":
      // flat hit shield seen from above — red with a strap across
      return (
        <g>
          <rect
            x={-3}
            y={-2.4}
            width={6}
            height={4.8}
            rx={1}
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth={0.4}
          />
          <line
            x1={-1.6}
            y1={-2.4}
            x2={-1.6}
            y2={2.4}
            stroke="#fecaca"
            strokeWidth={0.6}
          />
          <line
            x1={1.6}
            y1={-2.4}
            x2={1.6}
            y2={2.4}
            stroke="#fecaca"
            strokeWidth={0.6}
          />
        </g>
      );
    case "ball":
      return (
        <g transform="rotate(-30)">
          <ellipse rx={2.7} ry={1.7} fill="#8B5A2B" stroke="#5c3c1c" strokeWidth={0.4} />
          <line x1={-1.5} y1={0} x2={1.5} y2={0} stroke="#f5e6d0" strokeWidth={0.35} />
        </g>
      );
  }
}

function arrowHeadPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const len = 3.2;
  const spread = 0.45;
  const p1 = `${toX - len * Math.cos(angle - spread)},${toY - len * Math.sin(angle - spread)}`;
  const p2 = `${toX - len * Math.cos(angle + spread)},${toY - len * Math.sin(angle + spread)}`;
  return `${toX},${toY} ${p1} ${p2}`;
}

export function MovementGlyph({
  movement,
  preview = false,
  hitWidth = 7,
  onPointerDown,
}: {
  movement: BoardMovement;
  preview?: boolean;
  /** Width of the invisible grab stroke; the editor shrinks it as it zooms. */
  hitWidth?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const pts = movement.points;
  if (pts.length < 2) return null;
  const start = pts[0];
  const end = pts[pts.length - 1];
  const style = MOVEMENT_STYLE[movement.type];

  let d: string;
  let arrowFrom = start;
  if (pts.length > 2) {
    // freehand: smooth curve through the sampled points
    d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
    }
    d += ` L ${end.x} ${end.y}`;
    arrowFrom = pts[pts.length - 2];
  } else if (movement.type === "jump") {
    // bow a straight jump so it reads as an arc
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * len * 0.3;
    const cy = my + (dx / len) * len * 0.3;
    d = `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
    arrowFrom = { x: cx, y: cy };
  } else {
    d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const angle = Math.atan2(end.y - arrowFrom.y, end.x - arrowFrom.x);
  // the pen can pick its own colour and weight; arrows keep their house style
  const color = movement.color ?? style.color;
  const width = movement.width ?? 1.1;

  return (
    <g
      opacity={preview ? 0.6 : 1}
      className={onPointerDown ? "board-move" : undefined}
    >
      {/* fat invisible stroke so the arrow is easy to hit for erase */}
      {onPointerDown && (
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(hitWidth, width + 2)}
          style={{ cursor: "pointer" }}
          onPointerDown={onPointerDown}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={style.dash}
        strokeLinecap="round"
        pointerEvents="none"
      />
      {/* the freehand pen is a plain line — no arrowhead or tackle T-bar */}
      {movement.type === "draw" ? null : movement.type === "tackle" ? (
        // a tackle ends in a T-bar, not an arrowhead
        <line
          x1={end.x - 2.2 * Math.sin(angle)}
          y1={end.y + 2.2 * Math.cos(angle)}
          x2={end.x + 2.2 * Math.sin(angle)}
          y2={end.y - 2.2 * Math.cos(angle)}
          stroke={style.color}
          strokeWidth={1.3}
          strokeLinecap="round"
          pointerEvents="none"
        />
      ) : (
        <polygon
          points={arrowHeadPoints(arrowFrom.x, arrowFrom.y, end.x, end.y)}
          fill={style.color}
          pointerEvents="none"
        />
      )}
    </g>
  );
}

/**
 * Dimension line labelled in metres. `screenDelta` is the rotation the
 * containing view applies on screen (-90 in the landscape editor) so the
 * label can stay upright-ish either way.
 */
export function MeasureGlyph({
  measure,
  widthM = 40,
  screenDelta = 0,
  preview = false,
  hitWidth = 7,
  onPointerDown,
}: {
  measure: { a: { x: number; y: number }; b: { x: number; y: number } };
  widthM?: number;
  screenDelta?: number;
  preview?: boolean;
  /** Width of the invisible grab stroke; the editor shrinks it as it zooms. */
  hitWidth?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const { a, b } = measure;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 0.5) return null;
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  // keep the label the right way up after any on-screen rotation
  let s = (((ang + screenDelta) % 360) + 360) % 360;
  if (s > 90 && s < 270) s -= 180;
  const labelRot = s - screenDelta;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const rad = (ang * Math.PI) / 180;
  const px = Math.sin(rad);
  const py = -Math.cos(rad);
  const T = 1.9; // end-tick half length
  const C = "#b45309"; // readable amber on the light board
  return (
    <g
      opacity={preview ? 0.6 : 1}
      className={onPointerDown ? "board-move" : undefined}
    >
      {onPointerDown && (
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="transparent"
          strokeWidth={hitWidth}
          style={{ cursor: "pointer" }}
          onPointerDown={onPointerDown}
        />
      )}
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={C}
        strokeWidth={0.6}
        strokeDasharray="2 1.2"
        pointerEvents="none"
      />
      <line x1={a.x - px * T} y1={a.y - py * T} x2={a.x + px * T} y2={a.y + py * T} stroke={C} strokeWidth={0.8} pointerEvents="none" />
      <line x1={b.x - px * T} y1={b.y - py * T} x2={b.x + px * T} y2={b.y + py * T} stroke={C} strokeWidth={0.8} pointerEvents="none" />
      <g
        transform={`translate(${mid.x} ${mid.y}) rotate(${labelRot})`}
        pointerEvents="none"
      >
        <text
          textAnchor="middle"
          dy={-1.5}
          fontSize={3.4}
          fontWeight={700}
          fill={C}
          stroke="#f2f5ef"
          strokeWidth={0.7}
          paintOrder="stroke"
        >
          {formatMetres(len, widthM)}
        </text>
      </g>
    </g>
  );
}

/** Non-interactive thumbnail for board lists. */
export function BoardPreview({
  board,
  className,
}: {
  board: Board;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${PITCH_W} ${pitchHeight(board)}`}
      className={className}
      role="img"
      aria-label={`Diagram: ${board.name}`}
    >
      <Pitch variant={surfaceFor(board)} h={pitchHeight(board)} />
      {board.movements.map((m) => (
        <MovementGlyph key={m.id} movement={m} />
      ))}
      {(board.measures ?? []).map((ms) => (
        <MeasureGlyph key={ms.id} measure={ms} widthM={boardWidthM(board)} />
      ))}
      {(() => {
        const repeats = playerRepeatIndex(board.tokens);
        return board.tokens.map((t) => (
          <g key={t.id} transform={`translate(${t.x} ${t.y})`}>
            <TokenGlyph
              token={t}
              scale={iconScaleOf(board)}
              repeat={repeats.get(t.id) ?? 0}
            />
          </g>
        ));
      })()}
    </svg>
  );
}

/** Position along a movement's path at progress t (0..1), matching how
 *  MovementGlyph draws it (arc for a two-point jump, polyline otherwise).
 *  Shared by the editor's Play and the standalone AnimatedBoard. */
export function pointAlong(
  m: BoardMovement,
  t: number
): { x: number; y: number } {
  const pts = m.points;
  if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
  if (pts.length === 2 && m.type === "jump") {
    const [s, e] = pts;
    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * len * 0.3;
    const cy = my + (dx / len) * len * 0.3;
    const u = 1 - t;
    return {
      x: u * u * s.x + 2 * u * t * cx + t * t * e.x,
      y: u * u * s.y + 2 * u * t * cy + t * t * e.y,
    };
  }
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push(d);
    total += d;
  }
  let dist = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i] || i === segs.length - 1) {
      const f = segs[i] === 0 ? 1 : Math.min(1, dist / segs[i]);
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
      };
    }
    dist -= segs[i];
  }
  return pts[pts.length - 1];
}
