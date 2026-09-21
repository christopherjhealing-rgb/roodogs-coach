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
  ConeShape,
  MovementType,
  TokenType,
} from "@/lib/types";
import {
  CONE_COLORS,
  CONE_SHAPES,
  ConeMarker,
  DEFAULT_GRID_STEP_M,
  GRID_STEPS_M,
  MOVEMENT_STYLE,
  MeasureGlyph,
  MovementGlyph,
  PITCH_W,
  Pitch,
  TOKEN_LABELS,
  TokenGlyph,
  boardLengthM,
  boardWidthM,
  formatMetres,
  iconScaleOf,
  pathLengthUnits,
  pitchHeight,
  snapToGrid,
  surfaceFor,
} from "../BoardCanvas";
import { canPlay, runSequentialPlay } from "../boardPlay";
import {
  type ArrowEnd,
  distanceToPath,
  resizePath,
} from "@/lib/boardGeometry";

/** How close a tap has to land to an arrow, in pitch units, to count as
 *  "on" it while a drawing tool is active. The arrow's hit band is much
 *  fatter than this so it's easy to grab in Move mode; in Draw mode we want
 *  a near miss to start a new arrow rather than grab the old one. */
const DRAW_MODE_GRAB_UNITS = 2.5;

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

// Toolbar groups — collapsed into dropdowns so the whole palette fits on a
// phone without sideways scrolling.
const PEOPLE_TOKENS: TokenType[] = ["player", "opponent", "dad"];
const EQUIP_TOKENS: TokenType[] = ["cone", "hurdle", "bag", "pad", "ball"];

const MOVEMENT_TYPES: MovementType[] = [
  "run",
  "pass",
  "kick",
  "tackle",
  "jump",
  "draw",
];

const PLAYER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Tightest the frame can close in, as a multiple of the whole board. */
const MAX_ZOOM = 6;
/** How much one tap of the zoom buttons changes the frame. */
const ZOOM_STEP = 1.4;

/** Token size presets. 1 is the size the board has always drawn at. */
const ICON_SIZES: { label: string; scale: number }[] = [
  { label: "XS", scale: 0.55 },
  { label: "S", scale: 0.75 },
  { label: "M", scale: 1 },
  { label: "L", scale: 1.3 },
];

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
function eightWaySnap(start: Pt, p: Pt, step: number, h: number): Pt {
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
    return x >= 0 && x <= PITCH_W && y >= 0 && y <= h;
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
  // which palette dropdown is open (People / Equipment / Arrows), if any
  const [openMenu, setOpenMenu] = useState<
    "people" | "equipment" | "arrows" | null
  >(null);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [coneColor, setConeColor] = useState(CONE_COLORS[0].fill);
  const [coneShape, setConeShape] = useState<ConeShape>("triangle");
  // null = automatic numbering (next free number)
  const [playerNum, setPlayerNum] = useState<number | null>(null);
  // grid lock — snap placement/moves to the grid so cones line up
  const [snap, setSnap] = useState(false);
  const [gridStepM, setGridStepM] = useState(DEFAULT_GRID_STEP_M);
  const [widthStr, setWidthStr] = useState("40");
  const [lengthStr, setLengthStr] = useState("56");
  // the board size / icon size panel, opened from the "Size" button
  const [showSettings, setShowSettings] = useState(false);

  // Landscape pitch when the window is wider than tall (desktop, rotated
  // phone/tablet); portrait pitch otherwise. The Rotate button overrides
  // that choice — null means "follow the screen".
  const [wideScreen, setWideScreen] = useState(false);
  const [rotateTo, setRotateTo] = useState<"landscape" | "portrait" | null>(
    null
  );
  const landscape = rotateTo ? rotateTo === "landscape" : wideScreen;
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
  // dragging one end of a selected arrow to resize it
  const resize = useRef<{
    id: string;
    end: ArrowEnd;
    /** the arrow's points as they were when the drag began, so repeated
     *  moves transform from the original rather than compounding */
    from: Pt[];
  } | null>(null);
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

  // pinch-to-zoom: the visible viewBox rect (in the SVG's own coordinate
  // space), null = fitted to the whole pitch. Live pointers and pinch anchor.
  type Rect = { x: number; y: number; w: number; h: number };
  const [zoomView, setZoomView] = useState<Rect | null>(null);
  // hand tool: while on, a one-finger / mouse drag moves the view instead
  // of selecting or drawing. Only meaningful when zoomed in.
  const [panMode, setPanMode] = useState(false);
  const panDrag = useRef<{ start: Pt; startView: Rect } | null>(null);
  const pointers = useRef<Map<number, Pt>>(new Map());
  const pinch = useRef<{
    startDist: number;
    startMid: Pt;
    startView: Rect;
  } | null>(null);

  // mouse hover position on the pitch — drives the ghost preview in place
  // mode (never set for touch, so phones are unaffected)
  const [hoverPos, setHoverPos] = useState<Pt | null>(null);

  useEffect(() => {
    setHoverPos(null);
  }, [mode]);

  // close an open palette dropdown when tapping anywhere outside the palette
  // (including the canvas, so placing a tool dismisses the menu)
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest?.("[data-palette]")) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openMenu]);

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
    if (b) {
      setWidthStr(String(boardWidthM(b)));
      setLengthStr(String(Math.round(boardLengthM(b))));
    }
    setLoaded(true);
  }, [boardId]);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 640px) and (orientation: landscape)"
    );
    const update = () => {
      setWideScreen(mq.matches);
      // physically turning the phone or resizing the window is a clearer
      // statement of intent than an earlier tap, so it takes the wheel back
      setRotateTo(null);
    };
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

  function reshapeSelectedCone(shape: ConeShape) {
    const t = soleToken();
    if (!t) return;
    setConeShape(shape);
    commit((b) => ({
      tokens: b.tokens.map((x) => (x.id === t.id ? { ...x, shape } : x)),
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
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomToWidth(view.w / ZOOM_STEP);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomToWidth(view.w * ZOOM_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        setZoomView(null);
      } else if (zoomView && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = view.w * 0.1;
        if (e.key === "ArrowLeft") panBy(-step, 0);
        else if (e.key === "ArrowRight") panBy(step, 0);
        else if (e.key === "ArrowUp") panBy(0, -step);
        else if (e.key === "ArrowDown") panBy(0, step);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // handlers close over current board/selection/undo state
  });

  // Per-board geometry: the board is always PITCH_W units across, and as
  // many units tall as its real-world length calls for.
  const H = pitchHeight(board ?? {});
  const widthM = boardWidthM(board ?? {});
  const iconScale = iconScaleOf(board ?? {});
  // how far the board is turned on screen; lettering is spun back by this
  const screenDelta = landscape ? -90 : 0;

  // The SVG viewBox when fully zoomed out — pitch space in portrait, the
  // rotated space in landscape.
  const baseView: Rect = landscape
    ? { x: 0, y: 0, w: H, h: PITCH_W }
    : { x: 0, y: 0, w: PITCH_W, h: H };
  const view = zoomView ?? baseView;

  // Hit areas are sized for a cold thumb *on screen*, so they must shrink as
  // the view zooms in — otherwise a 6-unit circle that's 48px at full size
  // is 290px at 6×, and swallows the gap between two cones 12.5 units apart.
  // Floored at the drawn glyph, so an icon is always at least as easy to hit
  // as it is to see.
  const zoomFactor = baseView.w / view.w;
  const grabHitR = Math.max(
    4.5 * iconScale,
    Math.max(6, 6 * iconScale) / zoomFactor
  );
  // With a placing tool the intent is to put something down, so an icon
  // only claims a tap that lands on the icon itself (plus a hair). The
  // generous thumb catchment is for grabbing in Move/Erase — on a 5 m grid
  // it would otherwise leave no gap at all to drop a player between cones.
  const placeHitR = 3.6 * iconScale;
  const tokenHitR = mode.kind === "place" ? placeHitR : grabHitR;
  const lineHitW = Math.max(3, 7 / zoomFactor);

  // reset the zoom whenever the orientation flips (their view boxes differ)
  useEffect(() => {
    setZoomView(null);
    pinch.current = null;
  }, [landscape, H]);

  // no zoom, nothing to pan — the hand tool has no job at full size
  useEffect(() => {
    if (!zoomView) setPanMode(false);
  }, [zoomView]);

  /** Screen position → pitch coordinates, honouring zoom and orientation. */
  function screenToPitch(clientX: number, clientY: number): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    // into the SVG's own coordinate space via the current viewBox
    const sx = view.x + ((clientX - rect.left) / rect.width) * view.w;
    const sy = view.y + ((clientY - rect.top) / rect.height) * view.h;
    // landscape draws the portrait pitch rotated 90° anticlockwise
    const px = landscape ? PITCH_W - sy : sx;
    const py = landscape ? sx : sy;
    return {
      x: Math.min(PITCH_W, Math.max(0, px)),
      y: Math.min(H, Math.max(0, py)),
    };
  }

  function toPitch(e: React.PointerEvent): Pt {
    return screenToPitch(e.clientX, e.clientY);
  }

  /** Distance and midpoint (screen px) of the two active pointers. */
  function pinchGeom() {
    const pts = [...pointers.current.values()];
    const [a, b] = pts;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  /** A second finger landed — abandon any one-finger action and start a pinch. */
  function beginPinch() {
    drawPoints.current = [];
    setPreview(null);
    marqueeStart.current = null;
    setMarquee(null);
    measureStart.current = null;
    setMeasurePreview(null);
    drag.current = null;
    dragUndoTaken.current = false;
    const { dist, mid } = pinchGeom();
    pinch.current = { startDist: dist, startMid: mid, startView: view };
  }

  /** Update the zoom rect from the live pinch — scale about the midpoint and
   *  pan with it, clamped so the pitch always fills the frame. */
  function applyPinch() {
    if (!pinch.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const { dist, mid } = pinchGeom();
    const sv = pinch.current.startView;
    const scale = pinch.current.startDist / dist;
    const w = Math.max(baseView.w / MAX_ZOOM, Math.min(baseView.w, sv.w * scale));
    const h = w * (baseView.h / baseView.w);
    const ax =
      sv.x + ((pinch.current.startMid.x - rect.left) / rect.width) * sv.w;
    const ay =
      sv.y + ((pinch.current.startMid.y - rect.top) / rect.height) * sv.h;
    let x = ax - ((mid.x - rect.left) / rect.width) * w;
    let y = ay - ((mid.y - rect.top) / rect.height) * h;
    x = Math.max(0, Math.min(baseView.w - w, x));
    y = Math.max(0, Math.min(baseView.h - h, y));
    setZoomView({ x, y, w, h });
  }

  /**
   * Zoom so the frame is `w` units across, keeping whatever sits under
   * `anchor` (screen px, default the middle of the canvas) where it is.
   * Shared by the zoom buttons, the wheel and the pinch so all three clamp
   * the same way.
   */
  function zoomToWidth(w: number, anchor?: Pt) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const nw = Math.max(baseView.w / MAX_ZOOM, Math.min(baseView.w, w));
    const nh = nw * (baseView.h / baseView.w);
    const fx = anchor ? (anchor.x - rect.left) / rect.width : 0.5;
    const fy = anchor ? (anchor.y - rect.top) / rect.height : 0.5;
    const ax = view.x + fx * view.w;
    const ay = view.y + fy * view.h;
    const x = Math.max(0, Math.min(baseView.w - nw, ax - fx * nw));
    const y = Math.max(0, Math.min(baseView.h - nh, ay - fy * nh));
    // back at full size is the same thing as not being zoomed at all
    setZoomView(nw >= baseView.w - 0.001 ? null : { x, y, w: nw, h: nh });
  }

  /** Slide the zoomed frame by (dx, dy) view units, kept inside the board. */
  function panBy(dx: number, dy: number) {
    if (!zoomView) return;
    const x = Math.max(0, Math.min(baseView.w - view.w, view.x + dx));
    const y = Math.max(0, Math.min(baseView.h - view.h, view.y + dy));
    setZoomView({ ...view, x, y });
  }

  // Ctrl/⌘ + wheel zooms — that's the trackpad pinch gesture and the usual
  // desktop convention. A plain wheel pans while zoomed in (two-finger
  // scroll on a trackpad), and is left alone at full size so the page
  // still scrolls with the pointer over the board.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomToWidth(view.w * Math.exp(e.deltaY * 0.002), {
          x: e.clientX,
          y: e.clientY,
        });
        return;
      }
      if (!zoomView) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const k = view.w / rect.width; // px → view units
      // shift + wheel scrolls sideways on a plain mouse
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      panBy(dx * k, dy * k);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // rebinds each render so it closes over the current view
  });

  function onCanvasPointerCancel(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    panDrag.current = null;
  }

  function nextAutoNumber(tokens: BoardToken[]): number {
    const used = tokens
      .filter((t) => t.type === "player")
      .map((t) => Number(t.label))
      .filter((n) => Number.isFinite(n));
    return used.length === 0 ? 1 : Math.max(...used) + 1;
  }

  // grid step in pitch units, from the chosen step in metres
  const stepU = (gridStepM / widthM) * PITCH_W;
  const snapStep = snap ? stepU : false;

  function onCanvasPointerDown(e: React.PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!board || playing) return;
    // two fingers → pinch-zoom, cancelling any one-finger action
    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }
    // the hand tool, or a middle-button drag on a mouse, moves the view
    if ((panMode || e.button === 1) && zoomView) {
      e.preventDefault();
      panDrag.current = {
        start: { x: e.clientX, y: e.clientY },
        startView: view,
      };
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
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
        // Auto counts up on its own; a picked number stays picked until
        // another is chosen, so the same player can be put down more than
        // once — where they start and where they end up in a set play.
        label = String(playerNum ?? nextAutoNumber(board.tokens));
      }
      const color = mode.token === "cone" ? coneColor : undefined;
      const shape = mode.token === "cone" ? coneShape : undefined;
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
            shape,
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
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      applyPinch();
      return;
    }
    if (panDrag.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const { start, startView } = panDrag.current;
      const k = startView.w / rect.width;
      const x = Math.max(
        0,
        Math.min(baseView.w - startView.w, startView.x - (e.clientX - start.x) * k)
      );
      const y = Math.max(
        0,
        Math.min(baseView.h - startView.h, startView.y - (e.clientY - start.y) * k)
      );
      setZoomView({ ...startView, x, y });
      return;
    }
    if (!board || playing) return;
    const p = toPitch(e);
    // ghost preview follows the mouse in place mode
    if (e.pointerType === "mouse" && mode.kind === "place" && !drag.current) {
      setHoverPos(p);
    }
    if (resize.current) {
      if (!dragUndoTaken.current) {
        pushUndo();
        dragUndoTaken.current = true;
      }
      const r = resize.current;
      const anchor =
        r.end === "start" ? r.from[r.from.length - 1] : r.from[0];
      // with grid lock on, a resized arrow snaps to the same eight compass
      // directions it would have been drawn along
      const target =
        snap && board.movements.find((m) => m.id === r.id)?.type !== "draw"
          ? eightWaySnap(anchor, p, stepU, H)
          : p;
      persist({
        ...board,
        movements: board.movements.map((m) =>
          m.id === r.id
            ? { ...m, points: resizePath(r.from, r.end, target) }
            : m
        ),
      });
      return;
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
          points: [pts[0], eightWaySnap(pts[0], p, stepU, H)],
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
    pointers.current.delete(e.pointerId);
    // finishing (or breaking) a pinch — don't fall through to draw/select
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    if (panDrag.current) {
      panDrag.current = null;
      return;
    }
    if (resize.current) {
      resize.current = null;
      return;
    }
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
        const end = eightWaySnap(pts[0], p, stepU, H);
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

  /** Begin dragging one end of an arrow. */
  function startResize(
    e: React.PointerEvent,
    movement: BoardMovement,
    end: ArrowEnd
  ) {
    e.stopPropagation();
    setSelected(selMovements([movement.id]));
    resize.current = {
      id: movement.id,
      end,
      from: movement.points.map((pt) => ({ ...pt })),
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
    } else if (mode.kind === "draw") {
      // Tapping an arrow with a drawing tool active used to start a second
      // arrow on top of it. Grab the existing one instead — but only on a
      // close hit, so a stroke starting near an arrow (off the end of a run,
      // say) still draws.
      if (distanceToPath(movement.points, toPitch(e)) > DRAW_MODE_GRAB_UNITS)
        return;
      e.stopPropagation();
      startDrag(e, selMovements([movement.id]));
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

  const tokenIcon = (t: TokenType) => (
    <svg viewBox="-5 -5 10 10" className="h-5 w-5">
      <TokenGlyph token={{ id: "icon", type: t, x: 0, y: 0, label: "1" }} />
    </svg>
  );

  const movementIcon = (m: MovementType) => (
    <svg viewBox="0 0 24 12" className="h-5 w-6 rounded bg-stone-100 ring-1 ring-stone-200">
      {m === "draw" ? (
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
          <polygon points="21,6 16,3.5 16,8.5" fill={MOVEMENT_STYLE[m].color} />
        </>
      )}
    </svg>
  );

  // Which tool each dropdown currently holds (drives its label + highlight).
  const activePerson =
    mode.kind === "place" && PEOPLE_TOKENS.includes(mode.token)
      ? mode.token
      : null;
  const activeEquip =
    mode.kind === "place" && EQUIP_TOKENS.includes(mode.token)
      ? mode.token
      : null;
  const activeArrow = mode.kind === "draw" ? mode.movement : null;

  const caret = (
    <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" aria-hidden>
      <path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // A palette dropdown: trigger chip + a panel of tool options below it.
  const dropdown = (
    id: "people" | "equipment" | "arrows",
    ariaLabel: string,
    fallbackLabel: string,
    triggerIcon: React.ReactNode,
    active: boolean,
    options: React.ReactNode
  ) => (
    <div className="relative">
      <button
        onClick={() => setOpenMenu((v) => (v === id ? null : id))}
        aria-expanded={openMenu === id}
        aria-label={ariaLabel}
        className={toolChip(active)}
      >
        {triggerIcon}
        <span className="flex items-center gap-0.5">
          {fallbackLabel}
          {caret}
        </span>
      </button>
      {openMenu === id && (
        <div className="absolute left-0 top-full z-30 mt-1 grid w-[172px] grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
          {options}
        </div>
      )}
    </div>
  );

  const placeOption = (t: TokenType) => (
    <button
      key={t}
      onClick={() => {
        setMode({ kind: "place", token: t });
        setOpenMenu(null);
      }}
      className={toolChip(mode.kind === "place" && mode.token === t)}
    >
      {tokenIcon(t)}
      {TOKEN_LABELS[t]}
    </button>
  );

  const arrowOption = (m: MovementType) => (
    <button
      key={m}
      onClick={() => {
        setMode({ kind: "draw", movement: m });
        setOpenMenu(null);
      }}
      className={toolChip(mode.kind === "draw" && mode.movement === m)}
    >
      {movementIcon(m)}
      {MOVEMENT_STYLE[m].label}
    </button>
  );

  const paletteButtons = (
    <>
      <button
        onClick={() => {
          setMode({ kind: "move" });
          setOpenMenu(null);
        }}
        className={toolChip(mode.kind === "move")}
      >
        <MoveIcon className="h-5 w-5" />
        Move
      </button>

      {dropdown(
        "people",
        "People tools",
        activePerson ? TOKEN_LABELS[activePerson] : "People",
        tokenIcon(activePerson ?? "player"),
        activePerson != null,
        PEOPLE_TOKENS.map(placeOption)
      )}

      {dropdown(
        "equipment",
        "Equipment tools",
        activeEquip ? TOKEN_LABELS[activeEquip] : "Equipment",
        tokenIcon(activeEquip ?? "cone"),
        activeEquip != null,
        EQUIP_TOKENS.map(placeOption)
      )}

      {dropdown(
        "arrows",
        "Arrow tools",
        activeArrow ? MOVEMENT_STYLE[activeArrow].label : "Arrows",
        movementIcon(activeArrow ?? "run"),
        activeArrow != null,
        MOVEMENT_TYPES.map(arrowOption)
      )}

      <button
        onClick={() => {
          setMode({ kind: "measure" });
          setOpenMenu(null);
        }}
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
        onClick={() => {
          setMode({ kind: "erase" });
          setOpenMenu(null);
        }}
        className={toolChip(mode.kind === "erase")}
      >
        <EraseIcon className="h-5 w-5" />
        Erase
      </button>
    </>
  );

  // shortening a board never deletes anything — icons simply sit past the
  // end until it's made longer again
  const offBoard = board ? board.tokens.filter((t) => t.y > H).length : 0;

  /** Board size is edited as a pair: whatever the inputs show is what gets
   *  stored, so changing the width never silently re-derives the length. */
  function persistSize(w: number, l: number) {
    if (!board) return;
    // 2 m is the narrowest real setup (the 2 m × 15 m drop-and-pop channel),
    // so the floor has to sit below it
    if (w < 2 || w > 200 || l < 2 || l > 300) return;
    persist({ ...board, widthM: w, lengthM: l });
  }

  const sizeInput = (
    value: string,
    setValue: (v: string) => void,
    label: string,
    apply: (n: number) => void
  ) => (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
        setValue(v);
        const num = parseInt(v, 10);
        if (Number.isFinite(num)) apply(num);
      }}
      aria-label={label}
      className="min-h-[36px] w-14 rounded-lg border border-stone-300 px-2 text-center text-sm outline-none focus:border-pitch"
    />
  );

  const boardSettings =
    showSettings || snap || mode.kind === "measure" ? (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
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
        <span className="font-medium text-stone-500">Board:</span>
        {sizeInput(widthStr, setWidthStr, "Board width in metres", (num) =>
          persistSize(num, parseInt(lengthStr, 10))
        )}
        <span className="text-stone-500">m wide ×</span>
        {sizeInput(lengthStr, setLengthStr, "Board length in metres", (num) =>
          persistSize(parseInt(widthStr, 10), num)
        )}
        <span className="text-stone-500">m long</span>
        <span className="pl-1 font-medium text-stone-500">Icons:</span>
        {ICON_SIZES.map((sz) => (
          <button
            key={sz.label}
            onClick={() => board && persist({ ...board, iconScale: sz.scale })}
            aria-pressed={iconScale === sz.scale}
            aria-label={`${sz.label} icons`}
            className={`min-h-[36px] rounded-full border px-2.5 font-semibold ${
              iconScale === sz.scale
                ? "border-pitch bg-pitch text-white"
                : "border-stone-300 bg-white text-stone-600"
            }`}
          >
            {sz.label}
          </button>
        ))}
        {offBoard > 0 && (
          <span className="basis-full font-medium text-amber-700">
            {offBoard} {offBoard === 1 ? "icon sits" : "icons sit"} past the end
            — lengthen the board to bring{" "}
            {offBoard === 1 ? "it" : "them"} back. Nothing has been deleted.
          </span>
        )}
      </div>
    ) : null;

  // Shared option rows. There's a single row at the top of the toolbar: it
  // edits the selected item when there is one, otherwise it sets the default
  // for the active place tool — so a colour/number picker never appears twice.
  const colourRow = (activeFill: string, onPick: (fill: string) => void) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-stone-500">Colour:</span>
      {CONE_COLORS.map((c) => (
        <button
          key={c.fill}
          onClick={() => onPick(c.fill)}
          aria-label={`${c.name} cone`}
          aria-pressed={activeFill === c.fill}
          className={`h-9 w-9 rounded-full border-2 ${
            activeFill === c.fill ? "border-pitch" : "border-stone-200"
          }`}
          style={{ backgroundColor: c.fill }}
        />
      ))}
    </div>
  );

  /** Colour swatches plus the three marker shapes, drawn in that colour. */
  const coneRow = (
    activeFill: string,
    onFill: (fill: string) => void,
    activeShape: ConeShape,
    onShape: (shape: ConeShape) => void
  ) => (
    <div className="flex flex-wrap items-center gap-y-1.5">
      {colourRow(activeFill, onFill)}
      <div className="flex items-center gap-1.5 pl-2">
        <span className="text-xs font-medium text-stone-500">Shape:</span>
        {CONE_SHAPES.map((c) => (
          <button
            key={c.shape}
            onClick={() => onShape(c.shape)}
            aria-label={`${c.label} shape`}
            aria-pressed={activeShape === c.shape}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white ${
              activeShape === c.shape ? "border-pitch" : "border-stone-200"
            }`}
          >
            <svg viewBox="-3.5 -3.5 7 7" className="h-6 w-6">
              <ConeMarker shape={c.shape} fill={activeFill} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );

  const numberRow = (
    isActive: (n: number) => boolean,
    onPick: (n: number) => void,
    leading: React.ReactNode
  ) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-stone-500">Number:</span>
      {leading}
      {PLAYER_NUMBERS.map((n) => (
        <button
          key={n}
          onClick={() => onPick(n)}
          aria-pressed={isActive(n)}
          className={`h-9 w-9 rounded-full border text-sm font-bold ${
            isActive(n)
              ? "border-pitch bg-pitch text-white"
              : "border-stone-300 bg-white text-stone-600"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );

  const hint = (
    <p className="text-center text-xs text-stone-400">
      {mode.kind === "move" &&
        "Tap to select, drag to move — or drag over empty pitch to select several. Tap an arrow to grab its ends and resize it."}
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

  // The single top options row — selection first, else the active place tool.
  let optionsRow: React.ReactNode = null;
  if (selectedToken?.type === "cone") {
    optionsRow = coneRow(
      selectedToken.color ?? CONE_COLORS[0].fill,
      (fill) => recolorSelectedCone(fill),
      selectedToken.shape ?? "triangle",
      (shape) => reshapeSelectedCone(shape)
    );
  } else if (selectedToken?.type === "player") {
    const st = selectedToken;
    optionsRow = numberRow(
      (n) => st.label === String(n),
      (n) => renumberSelectedPlayer(n),
      <button
        onClick={() => renumberSelectedPlayer(undefined)}
        aria-label="No number"
        className="min-h-[36px] rounded-full border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-500"
      >
        None
      </button>
    );
  } else if (selectedMovement) {
    const sm = selectedMovement;
    optionsRow = (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-stone-500">Type:</span>
        {MOVEMENT_TYPES.map((m) => (
          <button
            key={m}
            onClick={() => retypeSelectedMovement(m)}
            aria-pressed={sm.type === m}
            className={`min-h-[36px] rounded-full border px-2.5 text-xs font-semibold ${
              sm.type === m
                ? "border-pitch bg-pitch text-white"
                : "border-stone-300 bg-white text-stone-600"
            }`}
          >
            {MOVEMENT_STYLE[m].label}
          </button>
        ))}
      </div>
    );
  } else if (mode.kind === "place" && mode.token === "cone") {
    optionsRow = coneRow(
      coneColor,
      (fill) => setConeColor(fill),
      coneShape,
      (shape) => setConeShape(shape)
    );
  } else if (mode.kind === "place" && mode.token === "player") {
    optionsRow = numberRow(
      (n) => playerNum === n,
      (n) => setPlayerNum(n),
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
    );
  }

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
          {selectedLabel}
          {selectedMovement && selCount(selected) === 1
            ? " — drag an end to resize"
            : " selected — drag to move"}
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
    </div>
  ) : null;

  const legend = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
      {MOVEMENT_TYPES.map((m) => (
        <span key={m} className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 8" className="h-2.5 w-7 rounded-sm bg-stone-100 ring-1 ring-stone-200">
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
        H - 4,
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
      r={Math.max(5.4, 5.4 * iconScale)}
      fill="none"
      stroke="#1e5b3c"
      strokeWidth={0.7}
      strokeDasharray="1.6 1"
      pointerEvents="none"
    />
  );

  /** The two round grips on a selected arrow's ends. Dragging one
   *  lengthens, shortens or swings the arrow; the other end stays put. */
  const arrowHandles = (m: BoardMovement) => {
    if (m.points.length < 2) return null;
    const ends: { end: ArrowEnd; pt: Pt }[] = [
      { end: "start", pt: m.points[0] },
      { end: "end", pt: m.points[m.points.length - 1] },
    ];
    return ends.map(({ end, pt }) => (
      <g
        key={end}
        transform={`translate(${pt.x} ${pt.y})`}
        style={{ cursor: "pointer" }}
        onPointerDown={(e) => startResize(e, m, end)}
        data-testid={`arrow-handle-${end}`}
      >
        {/* generous grab area, same as the icons get */}
        <circle r={6} fill="transparent" />
        <circle r={2.6} fill="#ffffff" stroke="#1E5B3C" strokeWidth={0.9} />
        <circle r={1} fill="#1E5B3C" />
      </g>
    ));
  };

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
        // offset square to the arrow, so it never lands on the line itself
        // or on the grab handles now sitting at either end
        const pts = selMv[0].points;
        const mid = pts[Math.floor(pts.length / 2)];
        const a = pts[0];
        const b = pts[pts.length - 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len;
        const ny = (b.x - a.x) / len;
        deleteAt = { x: mid.x + nx * 8.5, y: mid.y + ny * 8.5 };
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
        {selMv.length === 1 && selCount(selected) === 1 &&
          arrowHandles(selMv[0])}
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
      (t) => Math.hypot(t.x - hoverPos.x, t.y - hoverPos.y) <= tokenHitR
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
              shape: mode.token === "cone" ? coneShape : undefined,
            }}
            scale={iconScale}
            screenDelta={screenDelta}
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
        fill="#1E5B3C"
        fillOpacity={0.1}
        stroke="#1E5B3C"
        strokeWidth={0.5}
        strokeDasharray="2 1.5"
        pointerEvents="none"
      />
    ) : null;

  const boardContent = (
    <>
      <Pitch variant={surfaceFor(board)} grid={snap ? stepU : 0} h={H} />
      {board.movements.map((m) => (
        <MovementGlyph
          key={m.id}
          movement={m}
          hitWidth={lineHitW}
          onPointerDown={(e) => onMovementPointerDown(e, m)}
        />
      ))}
      {(board.measures ?? []).map((ms) => (
        <MeasureGlyph
          key={ms.id}
          measure={ms}
          widthM={widthM}
          screenDelta={screenDelta}
          hitWidth={lineHitW}
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
          const ly = Math.min(H - 4, Math.max(8, last.y));
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
                fill="#b45309"
                stroke="#f2f5ef"
                strokeWidth={0.7}
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
            {/* generous invisible hit area for cold thumbs — never shrinks
                below the standard size, however small the icons are drawn */}
            <circle r={tokenHitR} fill="transparent" />
            <TokenGlyph token={t} scale={iconScale} screenDelta={screenDelta} />
            {/* mouse-only hover ring (see globals.css) */}
            <circle
              className="hover-ring"
              r={tokenHitR * 0.87}
              fill="none"
              stroke="#1E5B3C"
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

  const canvasCursor = panMode
    ? "cursor-grab active:cursor-grabbing"
    : mode.kind === "place" || mode.kind === "draw" || mode.kind === "measure"
      ? "cursor-crosshair"
      : "";

  const viewBoxStr = `${view.x} ${view.y} ${view.w} ${view.h}`;
  const zoomedIn = zoomView != null && view.w < baseView.w - 0.01;
  const zoomedOut = view.w >= baseView.w - 0.001;
  const zoomedMax = view.w <= baseView.w / MAX_ZOOM + 0.001;
  const zoomBtn =
    "flex h-10 w-10 items-center justify-center rounded-lg bg-black/55 text-lg font-bold text-white shadow disabled:opacity-30";
  const zoomControls = (
    // top-right, not bottom: the foot of a tall board sits under the fixed
    // nav until you scroll, and zoom controls you have to go looking for
    // are no use
    <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
      <button
        onClick={() => zoomToWidth(view.w / ZOOM_STEP)}
        disabled={zoomedMax}
        aria-label="Zoom in"
        title="Zoom in (+, or Ctrl and the wheel)"
        className={zoomBtn}
      >
        +
      </button>
      <button
        onClick={() => zoomToWidth(view.w * ZOOM_STEP)}
        disabled={zoomedOut}
        aria-label="Zoom out"
        title="Zoom out (−)"
        className={zoomBtn}
      >
        −
      </button>
      {zoomedIn && (
        <>
          <button
            onClick={() => setPanMode((v) => !v)}
            aria-pressed={panMode}
            aria-label="Move around the board"
            title="Drag to move around (or scroll, arrow keys, middle-button drag, two fingers)"
            className={`${zoomBtn} ${panMode ? "!bg-pitch" : ""}`}
          >
            ✋
          </button>
          <button
            onClick={() => setZoomView(null)}
            className="rounded-lg bg-black/55 px-2.5 py-1 text-xs font-semibold text-white shadow"
          >
            Reset zoom
          </button>
        </>
      )}
    </div>
  );

  // How much of the window's width the canvas can have: a wide screen also
  // carries the 240px tool sidebar, a phone stacks the tools above instead.
  const gutterPx = wideScreen ? 300 : 32;

  // A portrait board is normally as wide as its column, which is right on a
  // phone. Forced into portrait on a wide screen it would run metres off the
  // bottom of the page, so there it's sized from its height instead.
  const portraitStyle: React.CSSProperties = wideScreen
    ? {
        aspectRatio: `${PITCH_W} / ${H}`,
        height: `min(calc(100dvh - 150px), calc((100vw - ${gutterPx}px) * ${
          H / PITCH_W
        }))`,
        margin: "0 auto",
      }
    : { aspectRatio: `${PITCH_W} / ${H}` };

  const svgEl = landscape ? (
    <svg
      ref={svgRef}
      viewBox={viewBoxStr}
      className={`mx-auto touch-none select-none rounded-xl shadow-sm ${canvasCursor}`}
      style={{
        aspectRatio: `${H} / ${PITCH_W}`,
        // the second term keeps a wide, short board inside the column —
        // and on a phone turned landscape there's no sidebar to allow for
        height: `min(calc(100dvh - 150px), calc((100vw - ${gutterPx}px) * ${
          PITCH_W / H
        }))`,
      }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerCancel={onCanvasPointerCancel}
      onPointerLeave={() => setHoverPos(null)}
      data-testid="board-canvas"
      data-orientation="landscape"
    >
      <g transform={`translate(0 ${PITCH_W}) rotate(-90)`}>{boardContent}</g>
    </svg>
  ) : (
    <svg
      ref={svgRef}
      viewBox={viewBoxStr}
      className={`touch-none select-none rounded-xl shadow-sm ${
        wideScreen ? "" : "w-full"
      } ${canvasCursor}`}
      style={portraitStyle}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerCancel={onCanvasPointerCancel}
      onPointerLeave={() => setHoverPos(null)}
      data-testid="board-canvas"
      data-orientation="portrait"
    >
      {boardContent}
    </svg>
  );

  const canvas = (
    <div className="relative">
      {svgEl}
      {zoomControls}
    </div>
  );

  return (
    // pb-24 clears the fixed bottom nav, so the foot of a tall board can
    // always be scrolled out from under it
    <div
      ref={containerRef}
      className="flex min-h-dvh flex-col gap-3 overflow-y-auto bg-stone-100 px-4 pb-24 pt-4"
    >
      {/* wraps rather than overflowing: an off-screen button could only be
          reached by scrolling the whole page sideways, which threw off where
          taps landed on the pitch */}
      <header className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2">
        <Link href="/board" className="min-h-[44px] shrink-0 py-2 text-sm text-stone-500">
          ‹ Boards
        </Link>
        <input
          value={board.name}
          onChange={(e) => persist({ ...board, name: e.target.value })}
          aria-label="Board name"
          className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 font-semibold outline-none focus:border-stone-300"
        />
        {/* the controls keep together and take their own row on a phone */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
          onClick={() =>
            setRotateTo(landscape ? "portrait" : "landscape")
          }
          aria-label={landscape ? "Rotate to portrait" : "Rotate to landscape"}
          title="Turn the board between portrait and landscape"
          className="min-h-[44px] shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-600"
        >
          ⟳ <span className="hidden sm:inline">
            {landscape ? "Portrait" : "Landscape"}
          </span>
        </button>
        <button
          onClick={() => setShowSettings((v) => !v)}
          aria-pressed={showSettings}
          aria-label="Board size"
          title="Board size and icon size"
          className={`min-h-[44px] shrink-0 rounded-lg border px-3 text-sm font-semibold ${
            showSettings
              ? "border-pitch bg-pitch text-white"
              : "border-stone-300 bg-white text-stone-600"
          }`}
        >
          ⇲ <span className="hidden sm:inline">Size</span>
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
          # <span className="hidden sm:inline">Grid</span>
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
        </div>
      </header>

      {/* the sidebar layout is about how much room the screen has, not which
          way the board is turned — rotating a board keeps the sidebar */}
      {wideScreen ? (
        <div className="flex flex-1 items-start justify-center gap-4">
          <div className="flex w-[240px] shrink-0 flex-col gap-2">
            <div data-palette className="flex flex-wrap gap-1.5">
              {paletteButtons}
            </div>
            {boardSettings}
            {optionsRow}
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
          <div data-palette className="flex flex-wrap gap-1.5">
            {paletteButtons}
          </div>
          {boardSettings}
          {optionsRow}
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
