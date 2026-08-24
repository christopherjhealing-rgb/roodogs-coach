"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { newId, storage } from "@/lib/storage";
import type {
  Board,
  BoardMovement,
  BoardToken,
  MovementType,
  TokenType,
} from "@/lib/types";
import {
  CONE_COLORS,
  MOVEMENT_STYLE,
  MovementGlyph,
  PITCH_H,
  PITCH_W,
  Pitch,
  TOKEN_LABELS,
  TokenGlyph,
} from "../BoardCanvas";

type Mode =
  | { kind: "move" }
  | { kind: "erase" }
  | { kind: "place"; token: TokenType }
  | { kind: "draw"; movement: MovementType };

const TOKEN_TYPES: TokenType[] = [
  "player",
  "opponent",
  "dad",
  "cone",
  "hurdle",
  "bag",
  "ball",
];

const MOVEMENT_TYPES: MovementType[] = [
  "run",
  "pass",
  "kick",
  "tackle",
  "jump",
];

const PLAYER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface Snapshot {
  tokens: BoardToken[];
  movements: BoardMovement[];
}

/** Position along a movement's path at progress t (0..1), matching how
 *  MovementGlyph draws it (arc for a two-point jump, polyline otherwise). */
function pointAlong(m: BoardMovement, t: number): { x: number; y: number } {
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

export default function BoardEditorPage() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;

  const [board, setBoard] = useState<Board | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "move" });
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [coneColor, setConeColor] = useState(CONE_COLORS[0].fill);
  // null = automatic numbering (next free number)
  const [playerNum, setPlayerNum] = useState<number | null>(null);

  // Landscape pitch when the window is wider than tall (desktop, rotated
  // phone/tablet); portrait pitch otherwise.
  const [landscape, setLandscape] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // what's tapped in Move mode — shows a selection ring and a delete button
  const [selected, setSelected] = useState<
    { kind: "token" | "movement"; id: string } | null
  >(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragTokenId = useRef<string | null>(null);
  const dragUndoTaken = useRef(false);
  // sampled finger path while drawing an arrow — empty means not drawing
  const drawPoints = useRef<{ x: number; y: number }[]>([]);
  const [preview, setPreview] = useState<BoardMovement | null>(null);

  // play-animation state: token id → animated position
  const [playing, setPlaying] = useState(false);
  const [animPositions, setAnimPositions] = useState<Map<
    string,
    { x: number; y: number }
  > | null>(null);
  const animRaf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(animRaf.current), []);

  function play() {
    if (!board || playing) return;
    // pair each arrow with the nearest unclaimed token at its start
    const assignments: { tokenId: string; movement: BoardMovement }[] = [];
    const used = new Set<string>();
    for (const m of board.movements) {
      if (m.points.length < 2) continue;
      let best: BoardToken | null = null;
      let bestD = Infinity;
      for (const t of board.tokens) {
        if (used.has(t.id)) continue;
        const d = Math.hypot(t.x - m.points[0].x, t.y - m.points[0].y);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best && bestD <= 10) {
        assignments.push({ tokenId: best.id, movement: m });
        used.add(best.id);
      }
    }
    if (assignments.length === 0) return;
    setPlaying(true);
    const startTs = performance.now();
    const DURATION = 2800;
    const tick = (nowTs: number) => {
      const t = Math.min(1, (nowTs - startTs) / DURATION);
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      setAnimPositions(
        new Map(
          assignments.map((a) => [a.tokenId, pointAlong(a.movement, ease)])
        )
      );
      if (t < 1) {
        animRaf.current = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          setAnimPositions(null);
          setPlaying(false);
        }, 800);
      }
    };
    animRaf.current = requestAnimationFrame(tick);
  }

  async function shareImage() {
    const svgEl = svgRef.current;
    if (!svgEl || !board) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("class");
    clone.removeAttribute("style");
    const vb = svgEl.viewBox.baseVal;
    const scale = 8;
    const w = vb.width * scale;
    const h = vb.height * scale;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(
      new Blob([xml], { type: "image/svg+xml" })
    );
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvasEl = document.createElement("canvas");
      canvasEl.width = w;
      canvasEl.height = h;
      canvasEl.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const blob: Blob | null = await new Promise((resolve) =>
        canvasEl.toBlob(resolve, "image/png")
      );
      if (!blob) return;
      const file = new File(
        [blob],
        `${board.name.replace(/[^\w\- ]+/g, "").trim() || "board"}.png`,
        { type: "image/png" }
      );
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: board.name });
          return;
        } catch {
          // cancelled or unsupported — fall through to download
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  useEffect(() => {
    setBoard(storage.getBoards().find((b) => b.id === boardId) ?? null);
    setLoaded(true);
  }, [boardId]);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 640px) and (orientation: landscape)"
    );
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        await containerRef.current.requestFullscreen();
        // on phones/tablets, ask for landscape while fullscreen
        const orientation = screen.orientation as unknown as {
          lock?: (o: string) => Promise<void>;
        };
        await orientation.lock?.("landscape").catch(() => {});
      }
    } catch {
      // fullscreen not available (e.g. iPhone Safari) — no harm done
    }
  }

  function persist(updated: Board) {
    const stamped = { ...updated, updatedMs: Date.now() };
    setBoard(stamped);
    storage.setBoards(
      storage.getBoards().map((b) => (b.id === stamped.id ? stamped : b))
    );
  }

  /** Snapshot the current board onto the undo stack. */
  function pushUndo() {
    if (!board) return;
    setUndoStack((prev) => [
      ...prev.slice(-49),
      {
        tokens: board.tokens.map((t) => ({ ...t })),
        movements: board.movements.map((m) => ({
          ...m,
          points: m.points.map((p) => ({ ...p })),
        })),
      },
    ]);
  }

  /** Apply a change to tokens/movements, recording undo history. */
  function commit(change: (b: Board) => Partial<Snapshot>) {
    if (!board) return;
    pushUndo();
    persist({ ...board, ...change(board) });
  }

  function deleteSelected() {
    if (!board || !selected) return;
    if (selected.kind === "token") {
      commit((b) => ({ tokens: b.tokens.filter((t) => t.id !== selected.id) }));
    } else {
      commit((b) => ({
        movements: b.movements.filter((m) => m.id !== selected.id),
      }));
    }
    setSelected(null);
  }

  function undo() {
    if (!board || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    persist({ ...board, tokens: last.tokens, movements: last.movements });
  }

  /** Screen position → pitch coordinates, in either orientation. */
  function toPitch(e: React.PointerEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    if (landscape) {
      // landscape view is the portrait pitch rotated 90° anticlockwise
      const u = ((e.clientX - rect.left) / rect.width) * PITCH_H;
      const v = ((e.clientY - rect.top) / rect.height) * PITCH_W;
      return {
        x: Math.min(PITCH_W, Math.max(0, PITCH_W - v)),
        y: Math.min(PITCH_H, Math.max(0, u)),
      };
    }
    return {
      x: Math.min(PITCH_W, Math.max(0, ((e.clientX - rect.left) / rect.width) * PITCH_W)),
      y: Math.min(PITCH_H, Math.max(0, ((e.clientY - rect.top) / rect.height) * PITCH_H)),
    };
  }

  function nextAutoNumber(tokens: BoardToken[]): number {
    const used = tokens
      .filter((t) => t.type === "player")
      .map((t) => Number(t.label))
      .filter((n) => Number.isFinite(n));
    return used.length === 0 ? 1 : Math.max(...used) + 1;
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (!board || playing) return;
    const p = toPitch(e);
    if (mode.kind === "move") {
      // tap on empty pitch clears the selection
      setSelected(null);
    } else if (mode.kind === "place") {
      // placing on empty pitch clears any current selection
      setSelected(null);
      let label: string | undefined;
      if (mode.token === "player") {
        const n = playerNum ?? nextAutoNumber(board.tokens);
        label = String(n);
        if (playerNum !== null) setPlayerNum(playerNum + 1);
      }
      const color = mode.token === "cone" ? coneColor : undefined;
      commit((b) => ({
        tokens: [
          ...b.tokens,
          { id: newId(), type: mode.token, x: p.x, y: p.y, label, color },
        ],
      }));
    } else if (mode.kind === "draw") {
      drawPoints.current = [p];
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (!board || playing) return;
    const p = toPitch(e);
    if (dragTokenId.current) {
      // snapshot once, on the first actual move, so a plain tap-to-select
      // doesn't add an empty undo step
      if (!dragUndoTaken.current) {
        pushUndo();
        dragUndoTaken.current = true;
      }
      persist({
        ...board,
        tokens: board.tokens.map((t) =>
          t.id === dragTokenId.current ? { ...t, x: p.x, y: p.y } : t
        ),
      });
    } else if (drawPoints.current.length > 0 && mode.kind === "draw") {
      const pts = drawPoints.current;
      const last = pts[pts.length - 1];
      // sample the path so curved drags become curved arrows
      if (Math.hypot(p.x - last.x, p.y - last.y) >= 3) pts.push(p);
      setPreview({
        id: "preview",
        type: mode.movement,
        points: [...pts, p],
      });
    }
  }

  function onCanvasPointerUp(e: React.PointerEvent) {
    if (dragTokenId.current) {
      dragTokenId.current = null;
      return;
    }
    if (drawPoints.current.length > 0 && mode.kind === "draw" && board) {
      const p = toPitch(e);
      const pts = [...drawPoints.current];
      drawPoints.current = [];
      setPreview(null);
      const last = pts[pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) >= 1) pts.push(p);
      const length = pts.reduce(
        (sum, pt, i) =>
          i === 0 ? 0 : sum + Math.hypot(pt.x - pts[i - 1].x, pt.y - pts[i - 1].y),
        0
      );
      if (length >= 4) {
        commit((b) => ({
          movements: [
            ...b.movements,
            { id: newId(), type: mode.movement, points: pts },
          ],
        }));
      }
    }
  }

  function onTokenPointerDown(e: React.PointerEvent, token: BoardToken) {
    if (playing) return;
    // Tapping an existing icon always selects it (so you can move or delete
    // it) — in Move mode and in any Place tool. Only Draw lets the tap fall
    // through, so you can still draw an arrow starting from a player.
    if (mode.kind === "move" || mode.kind === "place") {
      e.stopPropagation();
      // select it (so the delete bar shows) and arm a drag; the undo
      // snapshot is deferred until the token actually moves
      setSelected({ kind: "token", id: token.id });
      dragTokenId.current = token.id;
      dragUndoTaken.current = false;
      svgRef.current?.setPointerCapture(e.pointerId);
    } else if (mode.kind === "erase") {
      e.stopPropagation();
      commit((b) => ({ tokens: b.tokens.filter((t) => t.id !== token.id) }));
    }
  }

  function onMovementPointerDown(e: React.PointerEvent, movement: BoardMovement) {
    if (playing) return;
    if (mode.kind === "move" || mode.kind === "place") {
      e.stopPropagation();
      setSelected({ kind: "movement", id: movement.id });
    } else if (mode.kind === "erase") {
      e.stopPropagation();
      commit((b) => ({
        movements: b.movements.filter((m) => m.id !== movement.id),
      }));
    }
  }

  function clearBoard() {
    if (!board) return;
    if (!window.confirm("Clear everything off this board?")) return;
    commit(() => ({ tokens: [], movements: [] }));
  }

  if (!loaded) return null;

  if (!board) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-24 text-center">
        <p className="font-semibold">Board not found</p>
        <Link href="/board" className="font-medium text-pitch underline">
          Back to the whiteboard
        </Link>
      </div>
    );
  }

  const toolChip = (active: boolean) =>
    `flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 text-[10px] font-medium ${
      active
        ? "border-pitch bg-pitch text-white"
        : "border-stone-300 bg-white text-stone-600"
    }`;

  const paletteButtons = (
    <>
      <button
        onClick={() => setMode({ kind: "move" })}
        className={toolChip(mode.kind === "move")}
      >
        <span className="text-base leading-none" aria-hidden>✋</span>
        Move
      </button>
      {TOKEN_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => setMode({ kind: "place", token: t })}
          className={toolChip(mode.kind === "place" && mode.token === t)}
        >
          <svg viewBox="-5 -5 10 10" className="h-5 w-5">
            <TokenGlyph token={{ id: "icon", type: t, x: 0, y: 0, label: "1" }} />
          </svg>
          {TOKEN_LABELS[t]}
        </button>
      ))}
      {MOVEMENT_TYPES.map((m) => (
        <button
          key={m}
          onClick={() => setMode({ kind: "draw", movement: m })}
          className={toolChip(mode.kind === "draw" && mode.movement === m)}
        >
          <svg viewBox="0 0 24 12" className="h-5 w-6 rounded bg-pitch-dark">
            <line
              x1={3}
              y1={6}
              x2={17}
              y2={6}
              stroke={MOVEMENT_STYLE[m].color}
              strokeWidth={2}
              strokeDasharray={MOVEMENT_STYLE[m].dash
                ?.split(" ")
                .map((n) => Number(n) * 1.8)
                .join(" ")}
            />
            <polygon points="21,6 16,3.5 16,8.5" fill={MOVEMENT_STYLE[m].color} />
          </svg>
          {MOVEMENT_STYLE[m].label}
        </button>
      ))}
      <button
        onClick={() => setMode({ kind: "erase" })}
        className={toolChip(mode.kind === "erase")}
      >
        <span className="text-base leading-none" aria-hidden>🧽</span>
        Erase
      </button>
    </>
  );

  const subOptions =
    mode.kind === "place" && mode.token === "cone" ? (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-stone-500">Colour:</span>
        {CONE_COLORS.map((c) => (
          <button
            key={c.fill}
            onClick={() => setConeColor(c.fill)}
            aria-label={`${c.name} cone`}
            aria-pressed={coneColor === c.fill}
            className={`h-9 w-9 rounded-full border-2 ${
              coneColor === c.fill ? "border-pitch" : "border-stone-200"
            }`}
            style={{ backgroundColor: c.fill }}
          />
        ))}
      </div>
    ) : mode.kind === "place" && mode.token === "player" ? (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-stone-500">Number:</span>
        <button
          onClick={() => setPlayerNum(null)}
          aria-pressed={playerNum === null}
          className={`min-h-[36px] rounded-full border px-2.5 text-xs font-semibold ${
            playerNum === null
              ? "border-pitch bg-pitch text-white"
              : "border-stone-300 bg-white text-stone-600"
          }`}
        >
          Auto
        </button>
        {PLAYER_NUMBERS.map((n) => (
          <button
            key={n}
            onClick={() => setPlayerNum(n)}
            aria-pressed={playerNum === n}
            className={`h-9 w-9 rounded-full border text-sm font-bold ${
              playerNum === n
                ? "border-pitch bg-pitch text-white"
                : "border-stone-300 bg-white text-stone-600"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    ) : null;

  const hint = (
    <p className="text-center text-xs text-stone-400">
      {mode.kind === "move" && "Tap any icon to select it, then drag to move or hit Delete."}
      {mode.kind === "place" && `Tap the pitch to place a ${TOKEN_LABELS[mode.token].toLowerCase()} — or tap an existing icon to move it.`}
      {mode.kind === "draw" && `Drag on the pitch to draw a ${MOVEMENT_STYLE[mode.movement].label.toLowerCase()} arrow — curve it as you go.`}
      {mode.kind === "erase" && "Tap anything to rub it out."}
    </p>
  );

  const selectedLabel = (() => {
    if (!selected) return "";
    if (selected.kind === "movement") {
      const m = board.movements.find((x) => x.id === selected.id);
      return m ? `${MOVEMENT_STYLE[m.type].label} arrow` : "Arrow";
    }
    const t = board.tokens.find((x) => x.id === selected.id);
    if (!t) return "";
    return t.type === "player"
      ? `Player ${t.label ?? ""}`.trim()
      : TOKEN_LABELS[t.type];
  })();

  const selectionBar = selected ? (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-pitch bg-emerald-50 px-3 py-2">
      <span className="min-w-0 truncate text-sm font-semibold text-pitch">
        {selectedLabel} selected — drag to move
      </span>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={deleteSelected}
          className="min-h-[44px] rounded-lg bg-rose-600 px-3 text-sm font-bold text-white"
        >
          🗑 Delete
        </button>
        <button
          onClick={() => setSelected(null)}
          className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-600"
        >
          Done
        </button>
      </div>
    </div>
  ) : null;

  const legend = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
      {MOVEMENT_TYPES.map((m) => (
        <span key={m} className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 8" className="h-2.5 w-7 rounded-sm bg-pitch-dark">
            <line
              x1={2}
              y1={4}
              x2={22}
              y2={4}
              stroke={MOVEMENT_STYLE[m].color}
              strokeWidth={2}
              strokeDasharray={MOVEMENT_STYLE[m].dash
                ?.split(" ")
                .map((n) => Number(n) * 1.8)
                .join(" ")}
            />
          </svg>
          {MOVEMENT_STYLE[m].label}
        </span>
      ))}
    </div>
  );

  // a red round × the coach taps to delete the selected item
  const deleteButton = (bx: number, by: number) => (
    <g
      transform={`translate(${Math.min(PITCH_W - 3, Math.max(3, bx))} ${Math.min(
        PITCH_H - 3,
        Math.max(3, by)
      )})`}
      onPointerDown={(e) => {
        e.stopPropagation();
        deleteSelected();
      }}
      style={{ cursor: "pointer" }}
    >
      <circle r={6} fill="transparent" />
      <circle r={3.2} fill="#e11d48" stroke="#fff" strokeWidth={0.5} />
      <line x1={-1.4} y1={-1.4} x2={1.4} y2={1.4} stroke="#fff" strokeWidth={0.8} strokeLinecap="round" />
      <line x1={-1.4} y1={1.4} x2={1.4} y2={-1.4} stroke="#fff" strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );

  let selectionOverlay: React.ReactNode = null;
  if (selected?.kind === "token") {
    const t = board.tokens.find((x) => x.id === selected.id);
    if (t) {
      const pos = animPositions?.get(t.id) ?? t;
      selectionOverlay = (
        <g>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={5.4}
            fill="none"
            stroke="#1e5b3c"
            strokeWidth={0.7}
            strokeDasharray="1.6 1"
            pointerEvents="none"
          />
          {deleteButton(pos.x + 5.5, pos.y - 5.5)}
        </g>
      );
    }
  } else if (selected?.kind === "movement") {
    const mv = board.movements.find((x) => x.id === selected.id);
    if (mv && mv.points.length > 0) {
      const mid = mv.points[Math.floor(mv.points.length / 2)];
      selectionOverlay = (
        <g>
          <MovementGlyph movement={{ ...mv, id: "sel-highlight" }} preview />
          {deleteButton(mid.x, mid.y - 5)}
        </g>
      );
    }
  }

  const boardContent = (
    <>
      <Pitch />
      {board.movements.map((m) => (
        <MovementGlyph
          key={m.id}
          movement={m}
          onPointerDown={(e) => onMovementPointerDown(e, m)}
        />
      ))}
      {preview && <MovementGlyph movement={preview} preview />}
      {board.tokens.map((t) => {
        const pos = animPositions?.get(t.id) ?? t;
        return (
          <g
            key={t.id}
            transform={`translate(${pos.x} ${pos.y})`}
            onPointerDown={(e) => onTokenPointerDown(e, t)}
          >
            {/* generous invisible hit area for cold thumbs */}
            <circle r={6} fill="transparent" />
            <TokenGlyph token={t} />
          </g>
        );
      })}
      {!playing && selectionOverlay}
    </>
  );

  const canvas = landscape ? (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${PITCH_H} ${PITCH_W}`}
      className="mx-auto touch-none select-none rounded-xl shadow-sm"
      style={{
        aspectRatio: `${PITCH_H} / ${PITCH_W}`,
        height: "min(calc(100dvh - 150px), calc((100vw - 300px) * 0.714))",
      }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      data-testid="board-canvas"
      data-orientation="landscape"
    >
      <g transform={`translate(0 ${PITCH_W}) rotate(-90)`}>{boardContent}</g>
    </svg>
  ) : (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      className="w-full touch-none select-none rounded-xl shadow-sm"
      style={{ aspectRatio: `${PITCH_W} / ${PITCH_H}` }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      data-testid="board-canvas"
      data-orientation="portrait"
    >
      {boardContent}
    </svg>
  );

  return (
    <div
      ref={containerRef}
      className="flex min-h-dvh flex-col gap-3 overflow-y-auto bg-stone-100 px-4 pt-4"
    >
      <header className="mx-auto flex w-full max-w-4xl items-center gap-2">
        <Link href="/board" className="min-h-[44px] shrink-0 py-2 text-sm text-stone-500">
          ‹ Boards
        </Link>
        <input
          value={board.name}
          onChange={(e) => persist({ ...board, name: e.target.value })}
          aria-label="Board name"
          className="min-h-[44px] w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 font-semibold outline-none focus:border-stone-300"
        />
        {board.movements.length > 0 && (
          <button
            onClick={play}
            disabled={playing}
            aria-label="Play the movements"
            title="Play the movements"
            className="min-h-[44px] shrink-0 rounded-lg bg-pitch px-3 text-sm font-bold text-white disabled:opacity-40"
          >
            ▶ Play
          </button>
        )}
        <button
          onClick={shareImage}
          aria-label="Share as image"
          title="Share as image"
          className="min-h-[44px] shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-600"
        >
          ⤴
        </button>
        <button
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          className="min-h-[44px] shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-600"
        >
          {fullscreen ? "✕ Exit" : "⛶"}
        </button>
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="min-h-[44px] shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-600 disabled:opacity-40"
        >
          Undo
        </button>
      </header>

      {landscape ? (
        <div className="flex flex-1 items-start justify-center gap-4">
          <div className="flex w-[240px] shrink-0 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">{paletteButtons}</div>
            {subOptions}
            {selectionBar}
            {hint}
            {legend}
            <button
              onClick={clearBoard}
              className="min-h-[44px] w-fit rounded-lg px-3 text-sm font-medium text-rose-600"
            >
              Clear board
            </button>
          </div>
          <div className="min-w-0 flex-1">{canvas}</div>
        </div>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex w-max gap-1.5">{paletteButtons}</div>
          </div>
          {subOptions}
          {selectionBar}
          {hint}
          {canvas}
          {legend}
          <button
            onClick={clearBoard}
            className="min-h-[44px] w-fit self-center rounded-lg px-3 pb-4 text-sm font-medium text-rose-600"
          >
            Clear board
          </button>
        </>
      )}
    </div>
  );
}
