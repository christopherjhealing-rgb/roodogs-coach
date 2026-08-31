"use client";

/**
 * DrillDiagram — renders an animated rugby drill diagram from a compact spec string.
 *
 * Spec mini-language (tokens separated by ";", coords are 0-1 fractions, (0,0) = top-left):
 *   box                        dashed grid with corner cones
 *   size W H                   aspect ratio (default 4 3)
 *   try top|bottom|both        try line(s)
 *   A x y [label]              attacker      D x y [label]  defender
 *   C x y                     coach          Q x y          waiting player
 *   B x y                     ball           K x y          cone
 *   g x y w                   gate (2 cones) gv x y h       vertical gate
 *   r x1 y1 x2 y2             run (solid)    p x1 y1 x2 y2  pass (dashed)
 *   k x1 y1 x2 y2             kick (arc)     w x1 y1 x2 y2  wrestle/contact
 *   l x1 y1 x2 y2             plain line     z x y w h [lbl] shaded zone
 *   t x y text...             caption text
 *
 * Motion: players travel along run arrows in spec order; the ball rides with its
 * carrier and, on a pass/kick, flies to wherever the receiver is at arrival time.
 *
 * Colours come from CSS variables with fallbacks, so it works with or without a theme:
 *   --drill-ink, --drill-muted, --drill-accent, --drill-def, --drill-ball,
 *   --drill-turf, --drill-surface (label text on attacker circles)
 */

import { useEffect, useMemo, useRef } from "react";

type Seg = { t0: number; t1: number; x0: number; y0: number; x1: number; y1: number; cx?: number; cy?: number };
type Actor = { kind: "p" | "b"; x: number; y: number; x0: number; y0: number; t: number; segs: Seg[]; carrier: Actor | null; off: [number, number] };
type ArrowKind = "r" | "p" | "k";

const DUR: Record<ArrowKind, number> = { r: 1.5, p: 0.7, k: 1.3 };
const smooth = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u));
const unsmooth = (v: number) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (smooth(m) < v) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
const kctrl = (x1: number, y1: number, x2: number, y2: number): [number, number] =>
  [(x1 + x2) / 2 + (y1 - y2) * 0.35, (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.35 - 20];

function posAt(a: Actor, tau: number): [number, number] {
  const segs = a.segs;
  if (!segs.length) return [a.x0, a.y0];
  if (tau <= segs[0].t0) return [segs[0].x0, segs[0].y0];
  for (const sg of segs) {
    if (tau >= sg.t0 && tau <= sg.t1) {
      const u = smooth((tau - sg.t0) / (sg.t1 - sg.t0));
      if (sg.cx !== undefined && sg.cy !== undefined) {
        const m = 1 - u;
        return [m * m * sg.x0 + 2 * m * u * sg.cx + u * u * sg.x1, m * m * sg.y0 + 2 * m * u * sg.cy + u * u * sg.y1];
      }
      return [sg.x0 + (sg.x1 - sg.x0) * u, sg.y0 + (sg.y1 - sg.y0) * u];
    }
    if (tau < sg.t0) return [sg.x0, sg.y0];
  }
  const l = segs[segs.length - 1];
  return [l.x1, l.y1];
}

export type DrillProgram = { total: number; actors: Actor[] } | null;

export function buildDiagram(spec: string, name: string) {
  let W = 4, H = 3, box = false, tries: string | null = null;
  const items: string[][] = [];
  spec.split(";").map(x => x.trim()).filter(Boolean).forEach(tok => {
    const p = tok.split(/\s+/), t = p[0];
    if (t === "size") { W = +p[1]; H = +p[2]; return; }
    if (t === "box") { box = true; return; }
    if (t === "try") { tries = p[1]; return; }
    items.push(p);
  });
  const PW = 320, PH = Math.round((PW * H) / W), pad = 20;
  const X = (f: number | string) => +(pad + +f * (PW - 2 * pad)).toFixed(1);
  const Y = (f: number | string) => +(pad + +f * (PH - 2 * pad)).toFixed(1);

  const V = {
    ink: "var(--drill-ink, currentColor)",
    muted: "var(--drill-muted, #5B6878)",
    accent: "var(--drill-accent, #D3571B)",
    def: "var(--drill-def, #C8102E)",
    ball: "var(--drill-ball, #8B5A2B)",
    turf: "var(--drill-turf, #2F6B3A)",
    surface: "var(--drill-surface, #fff)",
  };
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

  const out: string[] = [];
  const actors: Actor[] = [];
  const arrows: { t: ArrowKind; x1: number; y1: number; x2: number; y2: number }[] = [];
  const cone = (x: number, y: number) => out.push(`<path d="M${x - 5} ${y + 4}L${x + 5} ${y + 4}L${x} ${y - 5}z" fill="${V.accent}"/>`);
  const player = (x: number, y: number, fill: string, ink: string, lbl: string, r = 9) => {
    const id = actors.length;
    actors.push({ kind: "p", x, y, x0: x, y0: y, t: 0, segs: [], carrier: null, off: [0, 0] });
    let g = `<g data-a="${id}" transform="translate(${x} ${y})"><circle r="${r}" fill="${fill}"/>`;
    if (lbl) {
      if (lbl.length <= 2) g += `<text y="3.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="${ink}">${esc(lbl)}</text>`;
      else g += `<text y="${r + 10}" text-anchor="middle" font-size="9.5" fill="${V.muted}">${esc(lbl)}</text>`;
    }
    out.push(g + "</g>");
  };
  const ballEl = (x: number, y: number) => {
    const id = actors.length;
    actors.push({ kind: "b", x, y, x0: x, y0: y, t: 0, segs: [], carrier: null, off: [0, 0] });
    out.push(`<g data-a="${id}" transform="translate(${x} ${y})"><ellipse rx="6.5" ry="4" fill="${V.ball}" stroke="currentColor" stroke-opacity=".5" stroke-width=".8"/></g>`);
  };

  if (box) {
    out.push(`<rect x="${X(0)}" y="${Y(0)}" width="${X(1) - X(0)}" height="${Y(1) - Y(0)}" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-dasharray="4 4"/>`);
    ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).forEach(([a, b]) => cone(X(a), Y(b)));
  }
  if (tries === "top" || tries === "both") out.push(`<line x1="${X(0)}" y1="${Y(0.02)}" x2="${X(1)}" y2="${Y(0.02)}" stroke="${V.turf}" stroke-width="3"/>`);
  if (tries === "bottom" || tries === "both") out.push(`<line x1="${X(0)}" y1="${Y(0.98)}" x2="${X(1)}" y2="${Y(0.98)}" stroke="${V.turf}" stroke-width="3"/>`);

  const late: string[][] = [];
  items.forEach(p => {
    const t = p[0];
    if (t === "z") {
      out.push(`<rect x="${X(p[1])}" y="${Y(p[2])}" width="${(X(+p[1] + +p[3]) - X(p[1])).toFixed(1)}" height="${(Y(+p[2] + +p[4]) - Y(p[2])).toFixed(1)}" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".25"/>`);
      const lbl = p.slice(5).join(" ");
      if (lbl) out.push(`<text x="${X(p[1]) + 4}" y="${Y(p[2]) + 11}" font-size="9" fill="${V.muted}">${esc(lbl)}</text>`);
    } else if (t === "l") {
      out.push(`<line x1="${X(p[1])}" y1="${Y(p[2])}" x2="${X(p[3])}" y2="${Y(p[4])}" stroke="currentColor" stroke-opacity=".45" stroke-dasharray="3 3"/>`);
    } else late.push(p);
  });
  late.forEach(p => {
    const t = p[0];
    if (t === "r" || t === "p" || t === "k") arrows.push({ t, x1: X(p[1]), y1: Y(p[2]), x2: X(p[3]), y2: Y(p[4]) });
    if (t === "r") out.push(`<line x1="${X(p[1])}" y1="${Y(p[2])}" x2="${X(p[3])}" y2="${Y(p[4])}" stroke="currentColor" stroke-width="1.6" marker-end="url(#drill-ar-ink)"/>`);
    else if (t === "p") out.push(`<line x1="${X(p[1])}" y1="${Y(p[2])}" x2="${X(p[3])}" y2="${Y(p[4])}" stroke="${V.accent}" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#drill-ar-acc)"/>`);
    else if (t === "k") {
      const x1 = X(p[1]), y1 = Y(p[2]), x2 = X(p[3]), y2 = Y(p[4]);
      const [cx, cy] = kctrl(x1, y1, x2, y2);
      out.push(`<path d="M${x1} ${y1}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}" fill="none" stroke="${V.muted}" stroke-width="1.6" stroke-dasharray="1.5 3" marker-end="url(#drill-ar-mut)"/>`);
    } else if (t === "w") {
      out.push(`<line x1="${X(p[1])}" y1="${Y(p[2])}" x2="${X(p[3])}" y2="${Y(p[4])}" stroke="${V.def}" stroke-width="3" stroke-linecap="round"/><line x1="${X(p[1])}" y1="${Y(p[2])}" x2="${X(p[3])}" y2="${Y(p[4])}" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>`);
    } else if (t === "K") cone(X(p[1]), Y(p[2]));
    else if (t === "g") { cone(X(+p[1] - +p[3] / 2), Y(p[2])); cone(X(+p[1] + +p[3] / 2), Y(p[2])); }
    else if (t === "gv") { cone(X(p[1]), Y(+p[2] - +p[3] / 2)); cone(X(p[1]), Y(+p[2] + +p[3] / 2)); }
    else if (t === "B") ballEl(X(p[1]), Y(p[2]));
    else if (t === "A") player(X(p[1]), Y(p[2]), "currentColor", V.surface, p.slice(3).join(" "));
    else if (t === "D") player(X(p[1]), Y(p[2]), V.def, "#fff", p.slice(3).join(" "));
    else if (t === "C") player(X(p[1]), Y(p[2]), V.muted, "#fff", p.slice(3).join(" ") || "C");
    else if (t === "Q") player(X(p[1]), Y(p[2]), V.muted, "#fff", "", 5);
    else if (t === "t") {
      const lbl = p.slice(3).join(" ");
      out.push(`<text x="${X(p[1])}" y="${Y(p[2]) + 3}" text-anchor="middle" font-size="9.5" fill="${V.muted}">${esc(lbl)}</text>`);
    }
  });

  // ---- motion program ----
  const players = actors.filter(a => a.kind === "p");
  const balls = actors.filter(a => a.kind === "b");
  const proj = (sg: Seg, x: number, y: number) => {
    const dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, L = dx * dx + dy * dy;
    if (!L) return { u: 0, d: Math.hypot(x - sg.x0, y - sg.y0) };
    let u = ((x - sg.x0) * dx + (y - sg.y0) * dy) / L;
    u = Math.max(0, Math.min(1, u));
    return { u, d: Math.hypot(sg.x0 + dx * u - x, sg.y0 + dy * u - y) };
  };
  const reach = (pl: Actor, x: number, y: number) => {
    let best = { d: Math.hypot(pl.x - x, pl.y - y), t: pl.t };
    pl.segs.forEach(sg => {
      if (sg.cx !== undefined) return;
      const pr = proj(sg, x, y);
      if (pr.d < best.d) best = { d: pr.d, t: sg.t0 + unsmooth(pr.u) * (sg.t1 - sg.t0) };
    });
    return best;
  };
  balls.forEach(b => {
    let c: Actor | null = null, bd = 16;
    players.forEach(pl => { const d = Math.hypot(pl.x - b.x, pl.y - b.y); if (d < bd) { bd = d; c = pl; } });
    if (c) { b.carrier = c; b.off = [b.x - (c as Actor).x, b.y - (c as Actor).y]; }
  });
  let tmax = 0;
  arrows.forEach(ar => {
    const dur = DUR[ar.t];
    if (ar.t === "r") {
      let pl: Actor | null = null, bd = 26;
      players.forEach(q => { const d = Math.hypot(q.x - ar.x1, q.y - ar.y1); if (d < bd) { bd = d; pl = q; } });
      if (!pl) return;
      const P = pl as Actor;
      const t0 = P.t, t1 = t0 + dur;
      P.segs.push({ t0, t1, x0: P.x, y0: P.y, x1: ar.x2, y1: ar.y2 });
      balls.forEach(b => {
        if (b.carrier === P && b.t <= t0) {
          b.segs.push({ t0, t1, x0: b.x, y0: b.y, x1: ar.x2 + b.off[0], y1: ar.y2 + b.off[1] });
          b.x = ar.x2 + b.off[0]; b.y = ar.y2 + b.off[1]; b.t = t1;
        }
      });
      P.x = ar.x2; P.y = ar.y2; P.t = t1; tmax = Math.max(tmax, t1);
    } else {
      let b: Actor | null = null, bd = 30, bt = 0;
      balls.forEach(q => {
        const r = q.carrier ? reach(q.carrier, ar.x1, ar.y1) : { d: Math.hypot(q.x - ar.x1, q.y - ar.y1), t: q.t };
        if (r.d < bd) { bd = r.d; b = q; bt = r.t; }
      });
      if (!b) { if (balls.length === 1) { b = balls[0]; bt = b.t; } else return; }
      const BL = b as Actor;
      const t0 = Math.max(bt, BL.segs.length ? BL.segs[0].t0 : 0);
      const from = posAt(BL, t0);
      BL.segs = BL.segs.filter(sg => sg.t0 < t0);
      const last = BL.segs[BL.segs.length - 1];
      if (last && last.t1 > t0) { last.t1 = t0; last.x1 = from[0]; last.y1 = from[1]; }
      const t1 = t0 + dur;
      let rc: Actor | null = null, rd = 26;
      players.forEach(q => { const r = reach(q, ar.x2, ar.y2); if (r.d < rd) { rd = r.d; rc = q; } });
      const dest = rc ? posAt(rc, t1) : [ar.x2, ar.y2];
      const seg: Seg = { t0, t1, x0: from[0], y0: from[1], x1: dest[0] + (rc ? 5 : 0), y1: dest[1] };
      if (ar.t === "k") { const c = kctrl(seg.x0, seg.y0, seg.x1, seg.y1); seg.cx = c[0]; seg.cy = c[1]; }
      BL.segs.push(seg); BL.x = seg.x1; BL.y = seg.y1; BL.t = t1; BL.carrier = rc;
      if (rc) {
        const RC = rc as Actor;
        BL.off = [5, 0];
        RC.t = Math.max(RC.t, t1);
        RC.segs.forEach(sg => {
          if (sg.t1 > t1) {
            const s0 = Math.max(t1, sg.t0);
            const p0 = posAt(RC, s0);
            BL.segs.push({ t0: s0, t1: sg.t1, x0: p0[0] + 5, y0: p0[1], x1: sg.x1 + 5, y1: sg.y1 });
            BL.x = sg.x1 + 5; BL.y = sg.y1; BL.t = sg.t1;
          }
        });
      }
      tmax = Math.max(tmax, BL.t, t1);
    }
  });

  const program: DrillProgram = tmax > 0 ? { total: tmax + 1.4, actors } : null;
  const portrait = H > W;
  const svg =
    `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Layout of ${esc(name)}"` +
    ` style="width:100%;height:auto;display:block${portrait ? ";max-width:62%;margin:0 auto" : ""}" font-family="inherit">` +
    `<defs>` +
    `<marker id="drill-ar-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>` +
    `<marker id="drill-ar-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${V.accent}"/></marker>` +
    `<marker id="drill-ar-mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${V.muted}"/></marker>` +
    `</defs>${out.join("")}</svg>`;
  return { svg, program };
}

export default function DrillDiagram({
  spec,
  name,
  animate = true,
  className,
}: {
  spec: string;
  name: string;
  animate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { svg, program } = useMemo(() => buildDiagram(spec, name), [spec, name]);

  useEffect(() => {
    const host = ref.current;
    if (!host || !program) return;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = new Map<number, SVGGElement>();
    host.querySelectorAll<SVGGElement>("[data-a]").forEach(g => nodes.set(+g.dataset.a!, g));
    const apply = (tau: number) => {
      nodes.forEach((g, i) => {
        const p = posAt(program.actors[i], tau);
        g.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
      });
    };
    if (!animate || reduced) { apply(0); return; }
    let raf = 0, visible = true;
    const io = new IntersectionObserver(es => { visible = es[0]?.isIntersecting ?? true; }, { rootMargin: "80px" });
    io.observe(host);
    const tick = (now: number) => {
      if (visible) apply((now / 1000) % program.total);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [program, animate]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
