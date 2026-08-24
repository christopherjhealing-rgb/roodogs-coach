"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EraseIcon, MoveIcon } from "@/components/NavIcon";
import { newId, storage } from "@/lib/storage";
import type {
  Board,
  BoardMeasure,
  BoardMovement,
  BoardToken,
  MovementType,
  TokenType,
} from "@/lib/types";
import {
  CONE_COLORS,
  MOVEMENT_STYLE,
  MeasureGlyph,
  MovementGlyph,
  PITCH_H,
  PITCH_W,
  Pitch,
  TOKEN_LABELS,
  TokenGlyph,
  formatMetres,
  pathLengthUnits,
  snapToGrid,
  surfaceFor,
} from "../BoardCanvas";
import { canPlay, runSequentialPlay } from "../boardPlay";

type Mode =
  | { kind: "move" }
  | { kind: "erase" }
  | { kind: "measure" }
  | { kind: "place"; token: TokenType }
  | { kind: "draw"; movement: MovementType };

/** Unified selection — any mix of tokens, arrows and distance markers. */
interface Selection {
  tokens: string[];
  movements: string[];
  measures: string[];
}

const selTokens = (ids: string[]): Selection => ({
  tokens: ids,
  movements: [],
  measures: [],
});
const selMovements = (ids: string[]): Selection => ({
  tokens: [],
  movements: ids,
  measures: [],
});
const selMeasures = (ids: string[]): Selection => ({
  tokens: [],
  movements: [],
  measures: ids,
});
const selCount = (s: Selection | null): number =>
  s ? s.tokens.length + s.movements.length + s.measures.length : 0;

const TOKEN_TYPES: TokenType[] = [
  "player",
  "opponent",
  "dad",
  "cone",
  "hurdle",
  "bag",
  "pad",
  "ball",
];

const MOVEMENT_TYPES: MovementType[] = [
  "run",
  "pass",
  "kick",
  "tackle",
  "jump",
  "draw",
];

const PLAYER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const GRID_STEPS_M = [1, 2, 5];

interface Snapshot {
  tokens: BoardToken[];
  movements: BoardMovement[];
  measures: BoardMeasure[];
}

type Pt = { x: number; y: number };

const OCT_X = [1, 1, 0, -1, -1, -1, 0, 1];
const OCT_Y = [0, 1, 1, 1, 0, -1, -1, -1];

/** With grid lock on, arrows snap to the eight compass directions with
 *  endpoints on grid intersections (whole steps from the start). */
function eightWaySnap(start: Pt, p: Pt, step: number): Pt {
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return { ...start };
  const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  const ux = OCT_X[oct];
  const uy = OCT_Y[oct];
  const dirLen = Math.hypot(ux, uy); // 1 for cardinal, √2 for diagonal
  let n = Math.max(1, Math.round(len / (step * dirLen)));
  const inBounds = (k: number) => {
    const x = start.x + ux * k * step;
    const y = start.y + uy * k * step;
    return x >= 0 && x <= PITCH_W && y >= 0 && y <= PITCH_H;
  };
  while (n > 1 && !inBounds(n)) n--;
  return { x: start.x + ux * n * step, y: start.y + uy * n * step };
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
  // grid lock — snap placement/moves to the grid so cones line up
  const [snap, setSnap] = useState(false);
  const [gridStepM, setGridStepM] = useState(2);
  const [widthStr, setWidthStr] = useState("40");

  // Landscape pitch when the window is wider than tall (desktop, rotated
  // phone/tablet); portrait pitch otherwise.
  const [landscape, setLandscape] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // current selection: one or many tokens, an arrow, or a distance marker
  const [selected, setSelected] = useState<Selection | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  // drag of the current selection (tokens, arrows, measures) as a group
  const drag = useRef<{
    sel: Selection;
    start: Pt;
    tokenOrigins: Map<string, Pt>;
    movementOrigins: Map<string, Pt[]>;
    measureOrigins: Map<string, { a: Pt; b: Pt }>;
  } | null>(null);
  const dragUndoTaken = useRef(false);
  // sampled finger path while drawing an arrow — empty means not drawing
  const drawPoints = useRef<Pt[]>([]);
  const [preview, setPreview] = useState<BoardMovement | null>(null);
  // measure-tool drag in progress
  const measureStart = useRef<Pt | null>(null);
  const [measurePreview, setMeasurePreview] = useState<{
    a: Pt;
    b: Pt;
  } | null>(null);
  // marquee rectangle drag in Move mode
  const marqueeStart = useRef<Pt | null>(null);
  const [marquee, setMarquee] = useState<{ a: Pt; b: Pt } | null>(null);

  // mouse hover position on the pitch — drives the ghost preview in place
  // mode (never set for touch, so phones are unaffected)
  const [hoverPos, setHoverPos] = useState<Pt | null>(null);

  useEffect(() => {
    setHoverPos(null);
  }, [mode]);

  // play-animation state: token id → animated position
  const [playing, setPlaying] = useState(false);
  const [animPositions, setAnimPositions] = useState<Map<string, Pt> | null>(
    null
  );
  const playCancel = useRef<(() => void) | null>(null);

  useEffect(() => () => playCancel.current?.(), []);

  function play() {
    if (!board || playing) return;
    setPlaying(true);
    playCancel.current = runSequentialPlay(board, setAnimPositions, () => {
      setAnimPositions(null);
      setPlaying(false);
    });
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
    const b = storage.getBoards().find((x) => x.id === boardId) ?? null;
    setBoard(b);
    if (b) setWidthStr(String(b.widthM ?? 40));
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
        measures: (board.measures ?? []).map((m) => ({
          ...m,
          a: { ...m.a },
          b: { ...m.b },
        })),
      },
    ]);
  }

  /** Apply a change, recording undo history. */
  function commit(change: (b: Board) => Partial<Snapshot>) {
    if (!board) return;
    pushUndo();
    persist({ ...board, ...change(board) });
  }

  function deleteSelected() {
    if (!board || !selected) return;
    const tk = new Set(selected.tokens);
    const mv = new Set(selected.movements);
    const ms = new Set(selected.measures);
    commit((b) => ({
      tokens: b.tokens.filter((t) => !tk.has(t.id)),
      movements: b.movements.filter((m) => !mv.has(m.id)),
      measures: (b.measures ?? []).filter((m) => !ms.has(m.id)),
    }));
    setSelected(null);
  }

  /** The single selected token, when exactly one item is selected. */
  function soleToken(): BoardToken | undefined {
    if (!board || !selected) return undefined;
    if (selCount(selected) !== 1 || selected.tokens.length !== 1)
      return undefined;
    return board.tokens.find((t) => t.id === selected.tokens[0]);
  }

  function soleMovement(): BoardMovement | undefined {
    if (!board || !selected) return undefined;
    if (selCount(selected) !== 1 || selected.movements.length !== 1)
      return undefined;
    return board.movements.find((m) => m.id === selected.movements[0]);
  }

  function recolorSelectedCone(fill: string) {
    const t = soleToken();
    if (!t) return;
    setConeColor(fill);
    commit((b) => ({
      tokens: b.tokens.map((x) => (x.id === t.id ? { ...x, color: fill } : x)),
    }));
  }

  function renumberSelectedPlayer(n: number | undefined) {
    const t = soleToken();
    if (!t) return;
    commit((b) => ({
      tokens: b.tokens.map((x) =>
        x.id === t.id ? { ...x, label: n != null ? String(n) : undefined } : x
      ),
    }));
  }

  function retypeSelectedMovement(type: MovementType) {
    const m = soleMovement();
    if (!m) return;
    commit((b) => ({
      movements: b.movements.map((x) => (x.id === m.id ? { ...x, type } : x)),
    }));
  }

  function undo() {
    if (!board || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    persist({
      ...board,
      tokens: last.tokens,
      movements: last.movements,
      measures: last.measures,
    });
    setSelected(null);
  }

  // keyboard shortcuts: Delete removes the selection, Ctrl/Cmd+Z undoes,
  // Escape deselects — ignored while typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // handlers close over current board/selection/undo state
  });

  /** Screen position → pitch coordinates, in either orientation. */
  function toPitch(e: React.PointerEvent): Pt {
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

  const widthM = board?.widthM ?? 40;
  // grid step in pitch units, from the chosen step in metres
  const stepU = (gridStepM / widthM) * PITCH_W;
  const snapStep = snap ? stepU : false;

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (!board || playing) return;
    const p = toPitch(e);
    if (mode.kind === "move") {
      // drag on empty pitch draws a marquee to select several at once;
      // a plain tap (tiny marquee) just clears the selection
      marqueeStart.current = p;
      setMarquee({ a: p, b: p });
      svgRef.current?.setPointerCapture(e.pointerId);
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
          {
            id: newId(),
            type: mode.token,
            x: snapToGrid(p.x, snapStep),
            y: snapToGrid(p.y, snapStep),
            label,
            color,
          },
        ],
      }));
    } else if (mode.kind === "draw") {
      // with grid lock on, arrows start on a grid intersection — but the
      // freehand pen is never grid-locked
      const gridArrow = snap && mode.movement !== "draw";
      drawPoints.current = [
        gridArrow
          ? { x: snapToGrid(p.x, snapStep), y: snapToGrid(p.y, snapStep) }
          : p,
      ];
      svgRef.current?.setPointerCapture(e.pointerId);
    } else if (mode.kind === "measure") {
      setSelected(null);
      measureStart.current = {
        x: snapToGrid(p.x, snapStep),
        y: snapToGrid(p.y, snapStep),
      };
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (!board || playing) return;
    const p = toPitch(e);
    // ghost preview follows the mouse in place mode
    if (e.pointerType === "mouse" && mode.kind === "place" && !drag.current) {
      setHoverPos(p);
    }
    if (drag.current) {
      // snapshot once, on the first actual move, so a plain tap-to-select
      // doesn't add an empty undo step
      if (!dragUndoTaken.current) {
        pushUndo();
        dragUndoTaken.current = true;
      }
      const d = drag.current;
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      const single =
        selCount(d.sel) === 1 && d.sel.tokens.length === 1;
      // a lone token snaps onto the grid; a group moves by a snapped delta
      // so everything keeps its relative layout
      const sdx = snapStep ? snapToGrid(dx, snapStep) : dx;
      const sdy = snapStep ? snapToGrid(dy, snapStep) : dy;
      persist({
        ...board,
        tokens: board.tokens.map((t) => {
          const o = d.tokenOrigins.get(t.id);
          if (!o) return t;
          return single
            ? {
                ...t,
                x: snapToGrid(o.x + dx, snapStep),
                y: snapToGrid(o.y + dy, snapStep),
              }
            : { ...t, x: o.x + sdx, y: o.y + sdy };
        }),
        movements: board.movements.map((m) => {
          const o = d.movementOrigins.get(m.id);
          if (!o) return m;
          return {
            ...m,
            points: o.map((pt) => ({ x: pt.x + sdx, y: pt.y + sdy })),
          };
        }),
        measures: (board.measures ?? []).map((m) => {
          const o = d.measureOrigins.get(m.id);
          if (!o) return m;
          return {
            ...m,
            a: { x: o.a.x + sdx, y: o.a.y + sdy },
            b: { x: o.b.x + sdx, y: o.b.y + sdy },
          };
        }),
      });
    } else if (marqueeStart.current && mode.kind === "move") {
      setMarquee({ a: marqueeStart.current, b: p });
    } else if (measureStart.current && mode.kind === "measure") {
      setMeasurePreview({
        a: measureStart.current,
        b: { x: snapToGrid(p.x, snapStep), y: snapToGrid(p.y, snapStep) },
      });
    } else if (drawPoints.current.length > 0 && mode.kind === "draw") {
      const pts = drawPoints.current;
      if (snap && mode.movement !== "draw") {
        // grid lock: straight arrow locked to the 8 compass directions
        setPreview({
          id: "preview",
          type: mode.movement,
          points: [pts[0], eightWaySnap(pts[0], p, stepU)],
        });
      } else {
        const last = pts[pts.length - 1];
        // sample the path so curved drags become curved arrows / pen strokes
        if (Math.hypot(p.x - last.x, p.y - last.y) >= 3) pts.push(p);
        setPreview({
          id: "preview",
          type: mode.movement,
          points: [...pts, p],
        });
      }
    }
  }

  function onCanvasPointerUp(e: React.PointerEvent) {
    if (drag.current) {
      drag.current = null;
      return;
    }
    if (marqueeStart.current && mode.kind === "move" && board) {
      const a = marqueeStart.current;
      const b = toPitch(e);
      marqueeStart.current = null;
      setMarquee(null);
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      if (maxX - minX < 3 && maxY - minY < 3) {
        // just a tap on empty pitch
        setSelected(null);
        return;
      }
      const inside = (pt: Pt) =>
        pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
      const sel: Selection = {
        tokens: board.tokens.filter((t) => inside(t)).map((t) => t.id),
        movements: board.movements
          .filter((m) => m.points.length > 0 && m.points.every(inside))
          .map((m) => m.id),
        measures: (board.measures ?? [])
          .filter((m) => inside(m.a) && inside(m.b))
          .map((m) => m.id),
      };
      setSelected(selCount(sel) > 0 ? sel : null);
      return;
    }
    if (measureStart.current && mode.kind === "measure" && board) {
      const a = measureStart.current;
      const p = toPitch(e);
      const b = { x: snapToGrid(p.x, snapStep), y: snapToGrid(p.y, snapStep) };
      measureStart.current = null;
      setMeasurePreview(null);
      if (Math.hypot(b.x - a.x, b.y - a.y) >= 2) {
        commit((bd) => ({
          measures: [...(bd.measures ?? []), { id: newId(), a, b }],
        }));
      }
      return;
    }
    if (drawPoints.current.length > 0 && mode.kind === "draw" && board) {
      const p = toPitch(e);
      let pts = [...drawPoints.current];
      drawPoints.current = [];
      setPreview(null);
      const gridArrow = snap && mode.movement !== "draw";
      if (gridArrow) {
        // grid lock: straight, 8-way, grid-length arrow
        const end = eightWaySnap(pts[0], p, stepU);
        pts = [pts[0], end];
        if (Math.hypot(end.x - pts[0].x, end.y - pts[0].y) < 0.01) return;
      } else {
        const last = pts[pts.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) >= 1) pts.push(p);
      }
      const length = pathLengthUnits(pts);
      if (length >= (gridArrow ? 1 : 4)) {
        commit((b) => ({
          movements: [
            ...b.movements,
            { id: newId(), type: mode.movement, points: pts },
          ],
        }));
      }
    }
  }

  /** Select and arm a drag of `sel` starting at the event's position. */
  function startDrag(e: React.PointerEvent, sel: Selection) {
    if (!board) return;
    setSelected(sel);
    const tk = new Set(sel.tokens);
    const mv = new Set(sel.movements);
    const ms = new Set(sel.measures);
    drag.current = {
      sel,
      start: toPitch(e),
      tokenOrigins: new Map(
        board.tokens
          .filter((t) => tk.has(t.id))
          .map((t) => [t.id, { x: t.x, y: t.y }])
      ),
      movementOrigins: new Map(
        board.movements
          .filter((m) => mv.has(m.id))
          .map((m) => [m.id, m.points.map((p) => ({ ...p }))])
      ),
      measureOrigins: new Map(
        (board.measures ?? [])
          .filter((m) => ms.has(m.id))
          .map((m) => [m.id, { a: { ...m.a }, b: { ...m.b } }])
      ),
    };
    dragUndoTaken.current = false;
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  /** The existing selection if this item belongs to it (group drag), else
   *  a fresh single-item selection. */
  function selectionFor(
    kind: keyof Selection,
    id: string,
    single: Selection
  ): Selection {
    return selected && selCount(selected) > 1 && selected[kind].includes(id)
      ? selected
      : single;
  }

  function onTokenPointerDown(e: React.PointerEvent, token: BoardToken) {
    if (playing || !board) return;
    // Tapping an existing icon always selects it (so you can move or delete
    // it) — in Move mode and in any Place tool. Only Draw lets the tap fall
    // through, so you can still draw an arrow starting from a player.
    if (mode.kind === "move" || mode.kind === "place") {
      e.stopPropagation();
      startDrag(e, selectionFor("tokens", token.id, selTokens([token.id])));
    } else if (mode.kind === "erase") {
      e.stopPropagation();
      commit((b) => ({ tokens: b.tokens.filter((t) => t.id !== token.id) }));
    }
  }

  function onMovementPointerDown(e: React.PointerEvent, movement: BoardMovement) {
    if (playing) return;
    if (mode.kind === "move" || mode.kind === "place") {
      e.stopPropagation();
      startDrag(
        e,
        selectionFor("movements", movement.id, selMovements([movement.id]))
      );
    } else if (mode.kind === "erase") {
      e.stopPropagation();
      commit((b) => ({
        movements: b.movements.filter((m) => m.id !== movement.id),
      }));
    }
  }

  function onMeasurePointerDown(e: React.PointerEvent, measure: BoardMeasure) {
    if (playing) return;
    if (mode.kind === "move" || mode.kind === "place") {
      e.stopPropagation();
      startDrag(
        e,
        selectionFor("measures", measure.id, selMeasures([measure.id]))
      );
    } else if (mode.kind === "erase") {
      e.stopPropagation();
      commit((b) => ({
        measures: (b.measures ?? []).filter((m) => m.id !== measure.id),
      }));
    }
  }

  function clearBoard() {
    if (!board) return;
    if (!window.confirm("Clear everything off this board?")) return;
    commit(() => ({ tokens: [], movements: [], measures: [] }));
    setSelected(null);
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
        <MoveIcon className="h-5 w-5" />
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
            {m === "draw" ? (
              // freehand squiggle, no arrowhead
              <path
                d="M3 8 Q7 2 11 7 T19 6"
                fill="none"
                stroke={MOVEMENT_STYLE[m].color}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ) : (
              <>
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
                <polygon
                  points="21,6 16,3.5 16,8.5"
                  fill={MOVEMENT_STYLE[m].color}
                />
              </>
            )}
          </svg>
          {MOVEMENT_STYLE[m].label}
        </button>
      ))}
      <button
        onClick={() => setMode({ kind: "measure" })}
        className={toolChip(mode.kind === "measure")}
      >
        <svg viewBox="0 0 24 12" className="h-5 w-6">
          <line x1={3} y1={6} x2={21} y2={6} stroke="currentColor" strokeWidth={1.6} />
          <line x1={3} y1={2.5} x2={3} y2={9.5} stroke="currentColor" strokeWidth={1.6} />
          <line x1={21} y1={2.5} x2={21} y2={9.5} stroke="currentColor" strokeWidth={1.6} />
          <line x1={9} y1={4.5} x2={9} y2={7.5} stroke="currentColor" strokeWidth={1.2} />
          <line x1={15} y1={4.5} x2={15} y2={7.5} stroke="currentColor" strokeWidth={1.2} />
        </svg>
        Distance
      </button>
      <button
        onClick={() => setMode({ kind: "erase" })}
        className={toolChip(mode.kind === "erase")}
      >
        <EraseIcon className="h-5 w-5" />
        Erase
      </button>
    </>
  );

  const boardSettings =
    snap || mode.kind === "measure" ? (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {snap && (
          <>
            <span className="font-medium text-stone-500">Grid:</span>
            {GRID_STEPS_M.map((m) => (
              <button
                key={m}
                onClick={() => setGridStepM(m)}
                aria-pressed={gridStepM === m}
                className={`min-h-[36px] rounded-full border px-2.5 font-semibold ${
                  gridStepM === m
                    ? "border-pitch bg-pitch text-white"
                    : "border-stone-300 bg-white text-stone-600"
                }`}
              >
                {m} m
              </button>
            ))}
          </>
        )}
        <span className="pl-1 font-medium text-stone-500">Board width:</span>
        <input
          inputMode="numeric"
          value={widthStr}
          onChange={(e) => {
            const s = e.target.value.replace(/\D/g, "").slice(0, 3);
            setWidthStr(s);
            const n = parseInt(s, 10);
            if (n >= 5 && n <= 200) persist({ ...board, widthM: n });
          }}
          aria-label="Board width in metres"
          className="min-h-[36px] w-14 rounded-lg border border-stone-300 px-2 text-center text-sm outline-none focus:border-pitch"
        />
        <span className="text-stone-500">m across</span>
      </div>
    ) : null;

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
      {mode.kind === "move" &&
        "Tap to select, drag to move — or drag over empty pitch to select several."}
      {mode.kind === "place" &&
        `Tap the pitch to place a ${TOKEN_LABELS[mode.token].toLowerCase()} — or tap an existing icon to move it.`}
      {mode.kind === "draw" &&
        (mode.movement === "draw"
          ? "Draw freehand on the pitch — scribble anything you like."
          : `Drag on the pitch to draw a ${MOVEMENT_STYLE[mode.movement].label.toLowerCase()} arrow — curve it as you go.`)}
      {mode.kind === "measure" &&
        "Drag between two points to mark the distance in metres."}
      {mode.kind === "erase" && "Tap anything to rub it out."}
    </p>
  );

  const selectedToken = soleToken();
  const selectedMovement = soleMovement();

  const selectedLabel = (() => {
    if (!selected) return "";
    const n = selCount(selected);
    if (n > 1) return `${n} items`;
    if (selectedMovement)
      return selectedMovement.type === "draw"
        ? "Pen line"
        : `${MOVEMENT_STYLE[selectedMovement.type].label} arrow`;
    if (selected.measures.length === 1) return "Distance marker";
    if (selectedToken) {
      return selectedToken.type === "player"
        ? `Player ${selectedToken.label ?? ""}`.trim()
        : TOKEN_LABELS[selectedToken.type];
    }
    return "Item";
  })();

  const selectionBar = selected ? (
    <div className="flex flex-col gap-2 rounded-lg border border-pitch bg-emerald-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
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
      {selectedToken?.type === "cone" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-stone-500">Colour:</span>
          {CONE_COLORS.map((c) => (
            <button
              key={c.fill}
              onClick={() => recolorSelectedCone(c.fill)}
              aria-label={`${c.name} cone`}
              aria-pressed={selectedToken.color === c.fill}
              className={`h-8 w-8 rounded-full border-2 ${
                (selectedToken.color ?? CONE_COLORS[0].fill) === c.fill
                  ? "border-pitch"
                  : "border-stone-200"
              }`}
              style={{ backgroundColor: c.fill }}
            />
          ))}
        </div>
      )}
      {selectedToken?.type === "player" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-stone-500">Number:</span>
          {PLAYER_NUMBERS.map((n) => (
            <button
              key={n}
              onClick={() => renumberSelectedPlayer(n)}
              aria-pressed={selectedToken.label === String(n)}
              className={`h-8 w-8 rounded-full border text-xs font-bold ${
                selectedToken.label === String(n)
                  ? "border-pitch bg-pitch text-white"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => renumberSelectedPlayer(undefined)}
            aria-label="No number"
            className="min-h-[32px] rounded-full border border-stone-300 bg-white px-2 text-xs font-medium text-stone-500"
          >
            None
          </button>
        </div>
      )}
      {selectedMovement && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-stone-500">Type:</span>
          {MOVEMENT_TYPES.map((m) => (
            <button
              key={m}
              onClick={() => retypeSelectedMovement(m)}
              aria-pressed={selectedMovement.type === m}
              className={`min-h-[32px] rounded-full border px-2.5 text-xs font-semibold ${
                selectedMovement.type === m
                  ? "border-pitch bg-pitch text-white"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              {MOVEMENT_STYLE[m].label}
            </button>
          ))}
        </div>
      )}
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

  // a red round × the coach taps to delete the selected item; it sits clear
  // of the item and only fires on release, so grabbing the item to drag it
  // can never delete it by accident
  const deleteButton = (bx: number, by: number) => (
    <g
      transform={`translate(${Math.min(PITCH_W - 4, Math.max(4, bx))} ${Math.min(
        PITCH_H - 4,
        Math.max(4, by)
      )})`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => {
        e.stopPropagation();
        deleteSelected();
      }}
      style={{ cursor: "pointer" }}
    >
      <circle r={4} fill="transparent" />
      <circle r={3.2} fill="#e11d48" stroke="#fff" strokeWidth={0.5} />
      <line x1={-1.4} y1={-1.4} x2={1.4} y2={1.4} stroke="#fff" strokeWidth={0.8} strokeLinecap="round" />
      <line x1={-1.4} y1={1.4} x2={1.4} y2={-1.4} stroke="#fff" strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );

  const selectionRing = (pos: Pt) => (
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
  );

  let selectionOverlay: React.ReactNode = null;
  if (selected) {
    const selTk = board.tokens.filter((t) => selected.tokens.includes(t.id));
    const selMv = board.movements.filter((m) =>
      selected.movements.includes(m.id)
    );
    const selMs = (board.measures ?? []).filter((m) =>
      selected.measures.includes(m.id)
    );
    const one = selCount(selected) === 1;
    let deleteAt: Pt | null = null;
    if (one) {
      if (selTk.length === 1) {
        const pos = animPositions?.get(selTk[0].id) ?? selTk[0];
        deleteAt = { x: pos.x + 7, y: pos.y - 7 };
      } else if (selMv.length === 1 && selMv[0].points.length > 0) {
        const mid = selMv[0].points[Math.floor(selMv[0].points.length / 2)];
        deleteAt = { x: mid.x, y: mid.y - 8.5 };
      } else if (selMs.length === 1) {
        deleteAt = {
          x: (selMs[0].a.x + selMs[0].b.x) / 2,
          y: (selMs[0].a.y + selMs[0].b.y) / 2 + 8.5,
        };
      }
    }
    selectionOverlay = (
      <g>
        {selTk.map((t) => {
          const pos = animPositions?.get(t.id) ?? t;
          return <g key={t.id}>{selectionRing(pos)}</g>;
        })}
        {selMv.map((m) => (
          <MovementGlyph
            key={m.id}
            movement={{ ...m, id: `sel-${m.id}` }}
            preview
          />
        ))}
        {selMs.map((m) => (
          <MeasureGlyph
            key={m.id}
            measure={m}
            widthM={widthM}
            screenDelta={landscape ? -90 : 0}
            preview
          />
        ))}
        {deleteAt && deleteButton(deleteAt.x, deleteAt.y)}
      </g>
    );
  }

  // ghost preview of the tool being placed, following the mouse — hidden
  // over an existing icon, where a click would select instead of place
  let ghost: React.ReactNode = null;
  if (mode.kind === "place" && hoverPos && !playing) {
    const overExisting = board.tokens.some(
      (t) => Math.hypot(t.x - hoverPos.x, t.y - hoverPos.y) <= 6
    );
    if (!overExisting) {
      const gx = snapToGrid(hoverPos.x, snapStep);
      const gy = snapToGrid(hoverPos.y, snapStep);
      const label =
        mode.token === "player"
          ? String(playerNum ?? nextAutoNumber(board.tokens))
          : undefined;
      ghost = (
        <g
          opacity={0.45}
          pointerEvents="none"
          transform={`translate(${gx} ${gy})`}
        >
          <TokenGlyph
            token={{
              id: "ghost",
              type: mode.token,
              x: 0,
              y: 0,
              label,
              color: mode.token === "cone" ? coneColor : undefined,
            }}
          />
        </g>
      );
    }
  }

  const tokenCursor =
    mode.kind === "erase"
      ? "pointer"
      : mode.kind === "move" || mode.kind === "place"
        ? "grab"
        : undefined;

  const marqueeRect =
    marquee &&
    (Math.abs(marquee.b.x - marquee.a.x) >= 3 ||
      Math.abs(marquee.b.y - marquee.a.y) >= 3) ? (
      <rect
        x={Math.min(marquee.a.x, marquee.b.x)}
        y={Math.min(marquee.a.y, marquee.b.y)}
        width={Math.abs(marquee.b.x - marquee.a.x)}
        height={Math.abs(marquee.b.y - marquee.a.y)}
        fill="#ffffff"
        fillOpacity={0.12}
        stroke="#ffffff"
        strokeWidth={0.5}
        strokeDasharray="2 1.5"
        pointerEvents="none"
      />
    ) : null;

  const screenDelta = landscape ? -90 : 0;

  const boardContent = (
    <>
      <Pitch variant={surfaceFor(board)} grid={snap ? stepU : 0} />
      {board.movements.map((m) => (
        <MovementGlyph
          key={m.id}
          movement={m}
          onPointerDown={(e) => onMovementPointerDown(e, m)}
        />
      ))}
      {(board.measures ?? []).map((ms) => (
        <MeasureGlyph
          key={ms.id}
          measure={ms}
          widthM={widthM}
          screenDelta={screenDelta}
          onPointerDown={(e) => onMeasurePointerDown(e, ms)}
        />
      ))}
      {preview && <MovementGlyph movement={preview} preview />}
      {preview &&
        preview.type !== "draw" &&
        preview.points.length >= 2 &&
        (() => {
          // live running distance while the arrow is being drawn (not the pen)
          const lenU = pathLengthUnits(preview.points);
          if (lenU < 2) return null;
          const last = preview.points[preview.points.length - 1];
          const lx = Math.min(PITCH_W - 8, Math.max(8, last.x));
          const ly = Math.min(PITCH_H - 4, Math.max(8, last.y));
          return (
            <g
              transform={`translate(${lx} ${ly}) rotate(${-screenDelta})`}
              pointerEvents="none"
            >
              <text
                textAnchor="middle"
                dy={-5}
                fontSize={3.6}
                fontWeight={700}
                fill="#fbbf24"
                stroke="#1c1917"
                strokeWidth={0.45}
                paintOrder="stroke"
              >
                {formatMetres(lenU, widthM)}
              </text>
            </g>
          );
        })()}
      {measurePreview && (
        <MeasureGlyph
          measure={measurePreview}
          widthM={widthM}
          screenDelta={screenDelta}
          preview
        />
      )}
      {board.tokens.map((t) => {
        const pos = animPositions?.get(t.id) ?? t;
        return (
          <g
            key={t.id}
            className="board-token"
            style={tokenCursor ? { cursor: tokenCursor } : undefined}
            transform={`translate(${pos.x} ${pos.y})`}
            onPointerDown={(e) => onTokenPointerDown(e, t)}
          >
            {/* generous invisible hit area for cold thumbs */}
            <circle r={6} fill="transparent" />
            <TokenGlyph token={t} />
            {/* mouse-only hover ring (see globals.css) */}
            <circle
              className="hover-ring"
              r={5.2}
              fill="none"
              stroke="#fff"
              strokeWidth={0.5}
              strokeDasharray="1.4 1"
              pointerEvents="none"
            />
          </g>
        );
      })}
      {ghost}
      {marqueeRect}
      {!playing && selectionOverlay}
    </>
  );

  const canvasCursor =
    mode.kind === "place" || mode.kind === "draw" || mode.kind === "measure"
      ? "cursor-crosshair"
      : "";

  const canvas = landscape ? (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${PITCH_H} ${PITCH_W}`}
      className={`mx-auto touch-none select-none rounded-xl shadow-sm ${canvasCursor}`}
      style={{
        aspectRatio: `${PITCH_H} / ${PITCH_W}`,
        height: "min(calc(100dvh - 150px), calc((100vw - 300px) * 0.714))",
      }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerLeave={() => setHoverPos(null)}
      data-testid="board-canvas"
      data-orientation="landscape"
    >
      <g transform={`translate(0 ${PITCH_W}) rotate(-90)`}>{boardContent}</g>
    </svg>
  ) : (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      className={`w-full touch-none select-none rounded-xl shadow-sm ${canvasCursor}`}
      style={{ aspectRatio: `${PITCH_W} / ${PITCH_H}` }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerLeave={() => setHoverPos(null)}
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
        {canPlay(board) && (
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
          onClick={() => setSnap((v) => !v)}
          aria-pressed={snap}
          aria-label="Grid lock"
          title="Snap to grid to line things up"
          className={`min-h-[44px] shrink-0 rounded-lg border px-3 text-sm font-semibold ${
            snap
              ? "border-pitch bg-pitch text-white"
              : "border-stone-300 bg-white text-stone-600"
          }`}
        >
          # Grid
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
          title="Undo (Ctrl+Z)"
          className="min-h-[44px] shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-600 disabled:opacity-40"
        >
          Undo
        </button>
      </header>

      {landscape ? (
        <div className="flex flex-1 items-start justify-center gap-4">
          <div className="flex w-[240px] shrink-0 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">{paletteButtons}</div>
            {boardSettings}
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
          {boardSettings}
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
