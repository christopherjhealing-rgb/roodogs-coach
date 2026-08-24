"use client";

import type {
  Board,
  BoardKind,
  BoardMovement,
  BoardToken,
  MovementType,
  TokenType,
} from "@/lib/types";

// Pitch coordinate space — everything on a board is stored in these units.
export const PITCH_W = 100;
export const PITCH_H = 140;

export const MOVEMENT_STYLE: Record<
  MovementType,
  { color: string; dash?: string; label: string }
> = {
  run: { color: "#ffffff", label: "Run" },
  pass: { color: "#fde047", dash: "3 2", label: "Pass" },
  kick: { color: "#7dd3fc", dash: "1 2.2", label: "Kick" },
  tackle: { color: "#fb7185", label: "Tackle" },
  jump: { color: "#c4b5fd", dash: "3 2", label: "Jump" },
};

export const TOKEN_LABELS: Record<TokenType, string> = {
  player: "Player",
  opponent: "Defender",
  dad: "Dad",
  cone: "Cone",
  hurdle: "Hurdle",
  bag: "Tackle bag",
  ball: "Ball",
};

/** Cone colour choices shown when the cone tool is selected. */
export const CONE_COLORS: { fill: string; stroke: string; name: string }[] = [
  { fill: "#fb923c", stroke: "#ea580c", name: "Orange" },
  { fill: "#facc15", stroke: "#ca8a04", name: "Yellow" },
  { fill: "#ef4444", stroke: "#b91c1c", name: "Red" },
  { fill: "#3b82f6", stroke: "#1d4ed8", name: "Blue" },
  { fill: "#22c55e", stroke: "#15803d", name: "Green" },
  { fill: "#f5f5f4", stroke: "#a8a29e", name: "White" },
];

function coneStroke(fill: string): string {
  return CONE_COLORS.find((c) => c.fill === fill)?.stroke ?? "#ea580c";
}

export type Surface = "pitch" | "plain";

/** Snap v to a grid of the given step (pitch units); falsy step = no snap. */
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

function GridLines({ step }: { step: number }) {
  const lines = [];
  for (let x = step; x < PITCH_W; x += step)
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={PITCH_H} stroke="#fff" strokeWidth={0.25} opacity={0.18} />
    );
  for (let y = step; y < PITCH_H; y += step)
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={PITCH_W} y2={y} stroke="#fff" strokeWidth={0.25} opacity={0.18} />
    );
  return <g>{lines}</g>;
}

export function Pitch({
  variant = "pitch",
  grid = 0,
}: {
  variant?: Surface;
  /** Grid line spacing in pitch units; 0/undefined hides the grid. */
  grid?: number;
}) {
  return (
    <g>
      <rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill="#2f7a44" />
      <rect
        x={2}
        y={2}
        width={PITCH_W - 4}
        height={PITCH_H - 4}
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.5}
        opacity={0.9}
      />
      {variant === "pitch" && (
        <>
          {/* try lines */}
          <line x1={2} y1={14} x2={PITCH_W - 2} y2={14} stroke="#fff" strokeWidth={0.5} />
          <line x1={2} y1={PITCH_H - 14} x2={PITCH_W - 2} y2={PITCH_H - 14} stroke="#fff" strokeWidth={0.5} />
          {/* halfway */}
          <line x1={2} y1={PITCH_H / 2} x2={PITCH_W - 2} y2={PITCH_H / 2} stroke="#fff" strokeWidth={0.5} />
          {/* dashed lines either side of halfway */}
          <line x1={2} y1={42} x2={PITCH_W - 2} y2={42} stroke="#fff" strokeWidth={0.35} strokeDasharray="2 2" opacity={0.6} />
          <line x1={2} y1={PITCH_H - 42} x2={PITCH_W - 2} y2={PITCH_H - 42} stroke="#fff" strokeWidth={0.35} strokeDasharray="2 2" opacity={0.6} />
        </>
      )}
      {grid > 0 && <GridLines step={grid} />}
    </g>
  );
}

export function TokenGlyph({ token }: { token: BoardToken }) {
  switch (token.type) {
    case "player":
      return (
        <g>
          <circle r={3.4} fill="#ffffff" stroke="#14532d" strokeWidth={0.9} />
          {token.label && (
            <text
              textAnchor="middle"
              dy={1.2}
              fontSize={3.4}
              fontWeight={700}
              fill="#14532d"
            >
              {token.label}
            </text>
          )}
        </g>
      );
    case "opponent":
      return (
        <g stroke="#ef4444" strokeWidth={1.2} strokeLinecap="round">
          <line x1={-2.3} y1={-2.3} x2={2.3} y2={2.3} />
          <line x1={-2.3} y1={2.3} x2={2.3} y2={-2.3} />
        </g>
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
          <text
            textAnchor="middle"
            dy={3.2}
            fontSize={2.6}
            fontWeight={700}
            fill="#f5f5f4"
          >
            D
          </text>
        </g>
      );
    case "cone": {
      // flat spot-marker: a small filled disc in its colour
      const fill = token.color ?? "#fb923c";
      return (
        <circle r={2.3} fill={fill} stroke={coneStroke(fill)} strokeWidth={0.5} />
      );
    }
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
    case "ball":
      return (
        <g transform="rotate(-30)">
          <ellipse rx={2.7} ry={1.7} fill="#a16207" stroke="#713f12" strokeWidth={0.4} />
          <line x1={-1.5} y1={0} x2={1.5} y2={0} stroke="#fef3c7" strokeWidth={0.35} />
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
  onPointerDown,
}: {
  movement: BoardMovement;
  preview?: boolean;
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
          strokeWidth={7}
          style={{ cursor: "pointer" }}
          onPointerDown={onPointerDown}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={style.color}
        strokeWidth={1.1}
        strokeDasharray={style.dash}
        strokeLinecap="round"
        pointerEvents="none"
      />
      {movement.type === "tackle" ? (
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
  onPointerDown,
}: {
  measure: { a: { x: number; y: number }; b: { x: number; y: number } };
  widthM?: number;
  screenDelta?: number;
  preview?: boolean;
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
  const C = "#fbbf24";
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
          strokeWidth={7}
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
          stroke="#1c1917"
          strokeWidth={0.45}
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
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      className={className}
      role="img"
      aria-label={`Diagram: ${board.name}`}
    >
      <Pitch variant={surfaceFor(board)} />
      {board.movements.map((m) => (
        <MovementGlyph key={m.id} movement={m} />
      ))}
      {(board.measures ?? []).map((ms) => (
        <MeasureGlyph key={ms.id} measure={ms} widthM={board.widthM ?? 40} />
      ))}
      {board.tokens.map((t) => (
        <g key={t.id} transform={`translate(${t.x} ${t.y})`}>
          <TokenGlyph token={t} />
        </g>
      ))}
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
