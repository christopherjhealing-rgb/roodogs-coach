import type { Limb, MovementDiagram, Pose, Props, Scene } from "./types";

// Segment lengths in box units.
const TORSO = 20;
const NECK = 3;
const HEAD_R = 4;
const UPPER_ARM = 10;
const FOREARM = 9;
const THIGH = 12;
const SHIN = 11;

export const DIAGRAM_W = 120;
export const DIAGRAM_H = 70;

type Pt = [number, number];
const rad = (deg: number) => (deg * Math.PI) / 180;
const step = ([x, y]: Pt, angle: number, len: number): Pt => [
  x + Math.cos(rad(angle)) * len,
  y + Math.sin(rad(angle)) * len,
];
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Skeleton {
  hip: Pt; shoulder: Pt; neck: Pt; head: Pt;
  elbowL: Pt; wristL: Pt; elbowR: Pt; wristR: Pt;
  kneeL: Pt; ankleL: Pt; kneeR: Pt; ankleR: Pt;
}

function limb(p: Pose, side: "L" | "R", which: "arm" | "leg"): Limb {
  const specific = p[`${which}${side}` as "armL"] as Limb | undefined;
  const both = p[which];
  const l = specific ?? both;
  if (l) return l;
  // Sensible defaults: arms hang by the side, legs stand straight down.
  return which === "arm" ? { upper: 90, lower: 90 } : { upper: 90, lower: 90 };
}

export function solve(p: Pose): Skeleton {
  const hip: Pt = p.hip;
  const shoulder = step(hip, p.torso, TORSO);
  const headAngle = p.head ?? p.torso;
  const neck = step(shoulder, headAngle, NECK);
  const head = step(neck, headAngle, HEAD_R);
  const aL = limb(p, "L", "arm"), aR = limb(p, "R", "arm");
  const lL = limb(p, "L", "leg"), lR = limb(p, "R", "leg");
  const elbowL = step(shoulder, aL.upper, UPPER_ARM), wristL = step(elbowL, aL.lower, FOREARM);
  const elbowR = step(shoulder, aR.upper, UPPER_ARM), wristR = step(elbowR, aR.lower, FOREARM);
  const kneeL = step(hip, lL.upper, THIGH), ankleL = step(kneeL, lL.lower, SHIN);
  const kneeR = step(hip, lR.upper, THIGH), ankleR = step(kneeR, lR.lower, SHIN);
  return { hip, shoulder, neck, head, elbowL, wristL, elbowR, wristR, kneeL, ankleL, kneeR, ankleR };
}

const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Each drawable is a line between two named joints (or a circle for the head).
type Seg = { from: keyof Skeleton; to: keyof Skeleton; far?: boolean };
const SEGMENTS: Seg[] = [
  { from: "shoulder", to: "elbowL", far: true }, { from: "elbowL", to: "wristL", far: true },
  { from: "hip", to: "kneeL", far: true }, { from: "kneeL", to: "ankleL", far: true },
  { from: "hip", to: "shoulder" }, { from: "shoulder", to: "neck" },
  { from: "hip", to: "kneeR" }, { from: "kneeR", to: "ankleR" },
  { from: "shoulder", to: "elbowR" }, { from: "elbowR", to: "wristR" },
];

function sceneSvg(scene: Scene): string {
  const floor = `<line x1="4" y1="58" x2="116" y2="58" class="pd-floor"/>`;
  switch (scene) {
    case "floor":
      return floor;
    case "mat":
      return `<rect x="12" y="57" width="96" height="3" rx="1.5" class="pd-mat"/>`;
    case "barre":
      return `${floor}<line x1="12" y1="58" x2="12" y2="22" class="pd-prop"/><circle cx="12" cy="26" r="2.4" class="pd-prop-fill"/>`;
    case "reformer":
    case "box": {
      const carriage = `<rect x="24" y="50" width="70" height="5" rx="1.5" class="pd-mat"/><line x1="8" y1="58" x2="112" y2="58" class="pd-floor"/><line x1="8" y1="58" x2="8" y2="30" class="pd-prop"/><line x1="100" y1="58" x2="100" y2="36" class="pd-prop"/><line x1="96" y1="36" x2="106" y2="36" class="pd-prop"/><rect x="26" y="47" width="10" height="3" rx="1.5" class="pd-mat"/>`;
      const box = scene === "box" ? `<rect x="40" y="38" width="30" height="12" rx="1.5" class="pd-box"/>` : "";
      return carriage + box;
    }
  }
}

function propsSvg(props: Props | undefined, s: Skeleton, animated: SkelFrames | null): string {
  if (!props) return "";
  const out: string[] = [];
  const at = (p: Pt) => `cx="${r1(p[0])}" cy="${r1(p[1])}"`;
  const point = (spec: string | Pt, sk: Skeleton): Pt => {
    if (Array.isArray(spec)) return spec;
    switch (spec) {
      case "hands": return mid(sk.wristL, sk.wristR);
      case "knees": return mid(sk.kneeL, sk.kneeR);
      case "ankles": return mid(sk.ankleL, sk.ankleR);
      case "feet": return mid(sk.ankleL, sk.ankleR);
      case "back": return step(sk.hip, 90, 5);
      default: return sk.hip;
    }
  };
  const animCircle = (spec: string | Pt) => {
    if (!animated || Array.isArray(spec)) return "";
    const pts = animated.map((f) => point(spec, f));
    return animAttr("cx", pts.map((p) => r1(p[0]))) + animAttr("cy", pts.map((p) => r1(p[1])));
  };
  if (props.ball) out.push(`<circle ${at(point(props.ball, s))} r="3.6" class="pd-ball">${animCircle(props.ball)}</circle>`);
  if (props.ring) out.push(`<circle ${at(point(props.ring, s))} r="5.5" class="pd-ring">${animCircle(props.ring)}</circle>`);
  if (props.weights) {
    for (const w of ["wristL", "wristR"] as const) {
      const pts = animated ? animated.map((f) => f[w]) : null;
      out.push(`<circle ${at(s[w])} r="1.8" class="pd-weight">${pts ? animAttr("cx", pts.map((p) => r1(p[0]))) + animAttr("cy", pts.map((p) => r1(p[1]))) : ""}</circle>`);
    }
  }
  if (props.band) {
    const [a, b]: [keyof Skeleton, keyof Skeleton] = props.band === "thighs" ? ["kneeL", "kneeR"] : ["ankleR", "wristR"];
    out.push(lineSvg(s[a], s[b], "pd-band", animated ? animated.map((f) => [f[a], f[b]] as [Pt, Pt]) : null));
  }
  if (props.straps) {
    const riser: Pt = [8, 32];
    const j: keyof Skeleton = props.straps === "feet" ? "ankleR" : "wristR";
    out.push(lineSvg(riser, s[j], "pd-band", animated ? animated.map((f) => [riser, f[j]] as [Pt, Pt]) : null));
  }
  return out.join("");
}

type SkelFrames = Skeleton[];

function animAttr(name: string, values: number[]): string {
  if (values.length < 2) return "";
  // Ping-pong: A;B;A (or A;B;C;B;A) so the loop is seamless.
  const seq = [...values, ...values.slice(0, -1).reverse()];
  const n = seq.length;
  const keyTimes = seq.map((_, i) => r1(i / (n - 1))).join(";");
  const splines = Array(n - 1).fill("0.45 0 0.55 1").join(";");
  return `<animate attributeName="${name}" values="${seq.join(";")}" keyTimes="${keyTimes}" calcMode="spline" keySplines="${splines}" dur="__DUR__" repeatCount="indefinite"/>`;
}

function lineSvg(a: Pt, b: Pt, cls: string, frames: [Pt, Pt][] | null): string {
  const anim = frames
    ? animAttr("x1", frames.map((f) => r1(f[0][0]))) + animAttr("y1", frames.map((f) => r1(f[0][1]))) +
      animAttr("x2", frames.map((f) => r1(f[1][0]))) + animAttr("y2", frames.map((f) => r1(f[1][1])))
    : "";
  return `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" class="${cls}">${anim}</line>`;
}

/**
 * Renders a diagram to an SVG string. Styling hooks (set by the host page):
 *   .pd-body  figure strokes        .pd-far   the far-side limbs
 *   .pd-head  head fill             .pd-mat   mat / carriage fill
 *   .pd-floor floor line            .pd-prop  barre, frame, footbar
 *   .pd-ball .pd-ring .pd-weight .pd-band .pd-box   props
 */
export function diagramSvg(d: MovementDiagram, opts: { animate?: boolean; title?: string } = {}): string {
  const animate = opts.animate !== false && d.frames.length > 1;
  const frames = d.frames.map(solve);
  const s = frames[0];
  const dur = `${d.dur ?? 2.6}s`;
  const body = SEGMENTS.map((seg) =>
    lineSvg(s[seg.from], s[seg.to], seg.far ? "pd-body pd-far" : "pd-body", animate ? frames.map((f) => [f[seg.from], f[seg.to]] as [Pt, Pt]) : null),
  ).join("");
  const headAnim = animate ? animAttr("cx", frames.map((f) => r1(f.head[0]))) + animAttr("cy", frames.map((f) => r1(f.head[1]))) : "";
  const head = `<circle cx="${r1(s.head[0])}" cy="${r1(s.head[1])}" r="${HEAD_R}" class="pd-head">${headAnim}</circle>`;
  const caption = d.caption ? `<text x="60" y="67.5" text-anchor="middle" class="pd-caption">${escapeXml(d.caption)}</text>` : "";
  const title = opts.title ? `<title>${escapeXml(opts.title)}</title>` : "";
  const svg = `<svg viewBox="0 0 ${DIAGRAM_W} ${DIAGRAM_H}" xmlns="http://www.w3.org/2000/svg" class="pose-diagram" role="img" aria-label="${escapeXml(opts.title ?? "Movement diagram")}">${title}${sceneSvg(d.scene)}${propsSvg(d.props, s, animate ? frames : null)}${body}${head}${caption}</svg>`;
  return svg.replace(/__DUR__/g, dur);
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Shared stylesheet for the diagram classes. `ink` = figure colour, `soft` = mat/floor colour. */
export function diagramCss(vars: { ink: string; soft: string; accent: string; muted: string }): string {
  return `
.pose-diagram { display: block; width: 100%; height: auto; }
.pose-diagram .pd-body { stroke: ${vars.ink}; stroke-width: 2.6; stroke-linecap: round; fill: none; }
.pose-diagram .pd-far { opacity: 0.42; }
.pose-diagram .pd-head { fill: ${vars.ink}; }
.pose-diagram .pd-mat { fill: ${vars.soft}; }
.pose-diagram .pd-box { fill: ${vars.soft}; stroke: ${vars.muted}; stroke-width: 1; }
.pose-diagram .pd-floor { stroke: ${vars.muted}; stroke-width: 1; stroke-linecap: round; }
.pose-diagram .pd-prop { stroke: ${vars.muted}; stroke-width: 2; stroke-linecap: round; fill: none; }
.pose-diagram .pd-prop-fill { fill: ${vars.muted}; }
.pose-diagram .pd-ball { fill: ${vars.accent}; }
.pose-diagram .pd-ring { fill: none; stroke: ${vars.accent}; stroke-width: 2; }
.pose-diagram .pd-weight { fill: ${vars.accent}; }
.pose-diagram .pd-band { stroke: ${vars.accent}; stroke-width: 1.6; stroke-linecap: round; stroke-dasharray: 2 1.5; fill: none; }
.pose-diagram .pd-caption { font: 500 5px system-ui, sans-serif; fill: ${vars.muted}; }
@media (prefers-reduced-motion: reduce) { .pose-diagram animate { display: none; } }
`;
}
