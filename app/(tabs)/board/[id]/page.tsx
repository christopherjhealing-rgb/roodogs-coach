"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { newId, storage } from "@/lib/storage";
import type {
  Board,
  BoardMeasure,
  BoardMovement,
  BoardToken,
  ConeShape,
  MovementType,
  PlayerRole,
} from "@/lib/types";
import {
  CONE_COLORS,
  DEFAULT_GRID_STEP_M,
  MOVEMENT_STYLE,
  MeasureGlyph,
  PEN_WIDTHS,
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
  playerRepeatIndex,
  snapToGrid,
  surfaceFor,
} from "../BoardCanvas";
import { canPlay, runSequentialPlay } from "../boardPlay";
import {
  type ArrowEnd,
  distanceToPath,
  resizePath,
} from "@/lib/boardGeometry";

import {
  type Mode,
  type Selection,
  type Snapshot,
  type Pt,
  DRAW_MODE_GRAB_UNITS,
  selTokens,
  selMovements,
  selMeasures,
  selCount,
  MOVEMENT_TYPES,
  PLAYER_NUMBERS,
  MAX_ZOOM,
  ZOOM_STEP,
  gridPoint,
} from "../_editor/editorConstants";
import {
  coneRow,
  roleRow,
  seqRow,
  numberRow,
  penRow,
} from "../_editor/OptionRows";
import Palette, { type MenuId } from "../_editor/Palette";
import BoardSettings from "../_editor/BoardSettings";
import { useBoardZoom } from "../_editor/useBoardZoom";
import ZoomControls from "../_editor/ZoomControls";
import BoardLegend from "../_editor/BoardLegend";

export default function BoardEditorPage() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;

  const [board, setBoard] = useState<Board | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "move" });
  // which palette dropdown is open (People / Equipment / Arrows), if any
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [coneColor, setConeColor] = useState(CONE_COLORS[0].fill);
  const [coneShape, setConeShape] = useState<ConeShape>("triangle");
  // null = automatic numbering (next free number); otherwise the label to
  // put on the next player — a number, or a position like "SH"
  const [playerLabel, setPlayerLabel] = useState<string | null>(null);
  // What's in the "Other" box. Kept as its own string rather than derived
  // from the label: derived, typing "1" (a chip number) emptied the box, so
  // "13" came out as player 3.
  const [otherDraft, setOtherDraft] = useState("");
  // pen style
  const [penColor, setPenColor] = useState(MOVEMENT_STYLE.draw.color);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1].width);
  // grid lock — snap placement/moves to the grid so cones line up
  // grid lock is on by default — the coach lays most things out on it
  const [snap, setSnap] = useState(true);
  const [gridStepM, setGridStepM] = useState(DEFAULT_GRID_STEP_M);
  const [widthStr, setWidthStr] = useState("40");
  const [lengthStr, setLengthStr] = useState("56");
  // the board size / icon size panel, opened from the "Size" button
  const [showSettings, setShowSettings] = useState(false);

  // Landscape pitch when the window is wider than tall (desktop, rotated
  // phone/tablet); portrait pitch otherwise. The Rotate button overrides
  // that choice — null means "follow the screen".
  const [wideScreen, setWideScreen] = useState(false);
  // a phone or small tablet physically held sideways — the one case where the
  // board starts landscape on its own. A desktop browser starts portrait.
  const [sidewaysDevice, setSidewaysDevice] = useState(false);
  const [rotateTo, setRotateTo] = useState<"landscape" | "portrait" | null>(
    null
  );
  const landscape = rotateTo ? rotateTo === "landscape" : sidewaysDevice;
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // current selection: one or many tokens, an arrow, or a distance marker
  const [selected, setSelected] = useState<Selection | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const solePlayerId =
    selected && selCount(selected) === 1 && selected.tokens.length === 1
      ? selected.tokens[0]
      : null;
  useEffect(() => {
    const typed = (l?: string | null) =>
      l && !PLAYER_NUMBERS.includes(Number(l)) ? l : "";
    const t = solePlayerId
      ? board?.tokens.find((x) => x.id === solePlayerId)
      : undefined;
    setOtherDraft(t?.type === "player" ? typed(t.label) : typed(playerLabel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solePlayerId]);
  // drag of the current selection (tokens, arrows, measures) as a group
  const drag = useRef<{
    sel: Selection;
    start: Pt;
    tokenOrigins: Map<string, Pt>;
    movementOrigins: Map<string, Pt[]>;
    measureOrigins: Map<string, { a: Pt; b: Pt }>;
  } | null>(null);
  const dragUndoTaken = useRef(false);
  // the size boxes push one undo step per edit, not per keystroke
  const sizeUndoTaken = useRef(false);
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
    const side = window.matchMedia(
      "(orientation: landscape) and (max-width: 1023px)"
    );
    const update = () => {
      setWideScreen(mq.matches);
      setSidewaysDevice(side.matches);
      // physically turning the phone or resizing the window is a clearer
      // statement of intent than an earlier tap, so it takes the wheel back
      setRotateTo(null);
    };
    update();
    mq.addEventListener("change", update);
    side.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      side.removeEventListener("change", update);
    };
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

  // A board updated on screen but not yet written to storage — see stage().
  const pendingWrite = useRef<Board | null>(null);

  /** Update the board on screen only; the storage write waits for flush().
   *  Used while a finger is moving, so a drag isn't a full rewrite of every
   *  board in storage — plus a sync push — on each pointer event. */
  function stage(updated: Board) {
    const stamped = { ...updated, updatedMs: Date.now() };
    setBoard(stamped);
    pendingWrite.current = stamped;
  }

  function flush() {
    const b = pendingWrite.current;
    if (!b) return;
    pendingWrite.current = null;
    storage.setBoards(storage.getBoards().map((x) => (x.id === b.id ? b : x)));
  }

  // leaving the page mid-drag still saves the drag
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function persist(updated: Board) {
    pendingWrite.current = null;
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
        widthM: board.widthM,
        lengthM: board.lengthM,
        iconScale: board.iconScale,
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

  function restyleSelectedPen(patch: { color?: string; width?: number }) {
    const m = soleMovement();
    if (!m || m.type !== "draw") return;
    if (patch.color) setPenColor(patch.color);
    if (patch.width) setPenWidth(patch.width);
    commit((b) => ({
      movements: b.movements.map((x) =>
        x.id === m.id ? { ...x, ...patch } : x
      ),
    }));
  }

  function setSelectedPlayerSeq(seq: number | undefined) {
    const t = soleToken();
    if (!t || t.type !== "player") return;
    commit((b) => ({
      tokens: b.tokens.map((x) => (x.id === t.id ? { ...x, seq } : x)),
    }));
  }

  function setSelectedPlayerRole(role: PlayerRole | undefined) {
    const t = soleToken();
    if (!t || t.type !== "player") return;
    commit((b) => ({
      tokens: b.tokens.map((x) => (x.id === t.id ? { ...x, role } : x)),
    }));
  }

  function relabelSelectedPlayer(label: string | undefined) {
    const t = soleToken();
    if (!t) return;
    commit((b) => ({
      tokens: b.tokens.map((x) => (x.id === t.id ? { ...x, label } : x)),
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
    const restored = {
      ...board,
      tokens: last.tokens,
      movements: last.movements,
      measures: last.measures,
      widthM: last.widthM,
      lengthM: last.lengthM,
      iconScale: last.iconScale,
    };
    persist(restored);
    // keep the size boxes showing what the board now is
    setWidthStr(String(boardWidthM(restored)));
    setLengthStr(String(Math.round(boardLengthM(restored))));
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

  const {
    baseView,
    view,
    zoomView,
    setZoomView,
    wideFrame,
    panMode,
    setPanMode,
    panDrag,
    pointers,
    pinch,
    startPinch,
    applyPinch,
    zoomToWidth,
    panBy,
    startPanDrag,
    applyPanDrag,
  } = useBoardZoom({
    svgRef,
    landscape,
    wideScreen,
    H,
    loaded,
    boardId: board?.id,
  });

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
    startPinch();
  }

  function onCanvasPointerCancel(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    panDrag.current = null;
    // a cancelled drag keeps where it got to, like a released one
    resize.current = null;
    drag.current = null;
    flush();
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
      startPanDrag(e.clientX, e.clientY);
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
        label = playerLabel ?? String(nextAutoNumber(board.tokens));
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
    if (applyPanDrag(e.clientX, e.clientY)) return;
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
      // with grid lock on, a resized arrow's end lands on a grid point
      const target =
        snap && board.movements.find((m) => m.id === r.id)?.type !== "draw"
          ? gridPoint(p, stepU, H)
          : p;
      stage({
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
      stage({
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
        // grid lock: straight arrow to the nearest grid point
        setPreview({
          id: "preview",
          type: mode.movement,
          points: [pts[0], gridPoint(p, stepU, H)],
          ...penStyle(mode.movement),
        });
      } else {
        const last = pts[pts.length - 1];
        // sample the path so curved drags become curved arrows / pen strokes
        if (Math.hypot(p.x - last.x, p.y - last.y) >= 3) pts.push(p);
        setPreview({
          id: "preview",
          type: mode.movement,
          points: [...pts, p],
          ...penStyle(mode.movement),
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
      flush();
      return;
    }
    if (drag.current) {
      drag.current = null;
      flush();
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
        // grid lock: a straight arrow between two grid points
        const end = gridPoint(p, stepU, H);
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
            {
              id: newId(),
              type: mode.movement,
              points: pts,
              ...penStyle(mode.movement),
            },
          ],
        }));
      }
    }
  }

  /** The pen's chosen colour and weight; arrows carry neither. */
  function penStyle(type: MovementType): { color?: string; width?: number } {
    return type === "draw" ? { color: penColor, width: penWidth } : {};
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

  /**
   * The token the coach meant. SVG hit-testing hands us whichever token was
   * drawn last among those whose catchment the tap is inside — in a tight
   * cluster that's usually a neighbour. Re-resolve to the nearest centre.
   */
  function nearestTokenTo(p: Pt, fallback: BoardToken): BoardToken {
    if (!board) return fallback;
    let best = fallback;
    let bestD = Infinity;
    for (const t of board.tokens) {
      const pos = animPositions?.get(t.id) ?? t;
      const dd = Math.hypot(pos.x - p.x, pos.y - p.y);
      if (dd <= tokenHitR && dd < bestD) {
        best = t;
        bestD = dd;
      }
    }
    return best;
  }

  function onTokenPointerDown(e: React.PointerEvent, hit: BoardToken) {
    if (playing || !board) return;
    const token = nearestTokenTo(toPitch(e), hit);
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
    // one undo step per edit, not one per digit typed
    if (!sizeUndoTaken.current) {
      pushUndo();
      sizeUndoTaken.current = true;
    }
    persist({ ...board, widthM: w, lengthM: l });
  }

  const settingsPanel = (
    <BoardSettings
      snap={snap}
      gridStepM={gridStepM}
      onGridStep={setGridStepM}
      showSizePanel={showSettings || mode.kind === "measure"}
      widthStr={widthStr}
      lengthStr={lengthStr}
      setWidthStr={setWidthStr}
      setLengthStr={setLengthStr}
      onSize={persistSize}
      onSizeFocus={() => {
        sizeUndoTaken.current = false;
      }}
      iconScale={iconScale}
      onIconScale={(scale) => commit(() => ({ iconScale: scale }))}
      offBoard={offBoard}
    />
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
    optionsRow = (
      <div className="flex flex-col gap-1.5">
        {numberRow(
          (n) => st.label === String(n),
          (n) => {
            relabelSelectedPlayer(String(n));
            setOtherDraft("");
          },
          <button
            onClick={() => {
              relabelSelectedPlayer(undefined);
              setOtherDraft("");
            }}
            aria-label="No number"
            className="min-h-[36px] rounded-full border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-500"
          >
            None
          </button>,
          otherDraft,
          (label) => {
            setOtherDraft(label);
            relabelSelectedPlayer(label || undefined);
          }
        )}
        {seqRow(st.seq, (seq) => setSelectedPlayerSeq(seq))}
        {roleRow(st.role, (role) => setSelectedPlayerRole(role))}
      </div>
    );
  } else if (selectedMovement) {
    const sm = selectedMovement;
    optionsRow = (
      <div className="flex flex-col gap-1.5">
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
      {sm.type === "draw" &&
        penRow(
          sm.color ?? MOVEMENT_STYLE.draw.color,
          sm.width ?? PEN_WIDTHS[1].width,
          (color) => restyleSelectedPen({ color }),
          (width) => restyleSelectedPen({ width })
        )}
      </div>
    );
  } else if (mode.kind === "draw" && mode.movement === "draw") {
    optionsRow = penRow(penColor, penWidth, setPenColor, setPenWidth);
  } else if (mode.kind === "place" && mode.token === "cone") {
    optionsRow = coneRow(
      coneColor,
      (fill) => setConeColor(fill),
      coneShape,
      (shape) => setConeShape(shape)
    );
  } else if (mode.kind === "place" && mode.token === "player") {
    optionsRow = (
      <div className="flex flex-col gap-1.5">
        {numberRow(
          (n) => playerLabel === String(n),
          (n) => {
            setPlayerLabel(String(n));
            setOtherDraft("");
          },
          <button
            onClick={() => {
              setPlayerLabel(null);
              setOtherDraft("");
            }}
            aria-pressed={playerLabel === null}
            className={`min-h-[36px] rounded-full border px-2.5 text-xs font-semibold ${
              playerLabel === null
                ? "border-pitch bg-pitch text-white"
                : "border-stone-300 bg-white text-stone-600"
            }`}
          >
            Auto
          </button>,
          otherDraft,
          (label) => {
            setOtherDraft(label);
            setPlayerLabel(label || null);
          }
        )}
      </div>
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

  const legend = <BoardLegend tokens={board.tokens} />;

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
        // put the × in the first spot that isn't on top of another icon,
        // so in a tight cluster it can't swallow a tap meant for a neighbour
        const others = board.tokens
          .filter((t) => t.id !== selTk[0].id)
          .map((t) => animPositions?.get(t.id) ?? t);
        const spots = [
          { x: 7, y: -7 }, { x: -7, y: -7 }, { x: 7, y: 7 }, { x: -7, y: 7 },
          { x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: -10 }, { x: 0, y: 10 },
          { x: 11, y: -11 }, { x: -11, y: -11 }, { x: 11, y: 11 }, { x: -11, y: 11 },
        ];
        const clear = spots.find((o) =>
          others.every(
            (q) => Math.hypot(q.x - (pos.x + o.x), q.y - (pos.y + o.y)) > 7
          )
        ) ?? spots[0];
        deleteAt = { x: pos.x + clear.x, y: pos.y + clear.y };
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
          ? (playerLabel ?? String(nextAutoNumber(board.tokens)))
          : undefined;
      // show the shade this placement will land with (a second 7 is lighter)
      const ghostRepeat = label
        ? board.tokens.filter((t) => t.type === "player" && t.label === label)
            .length
        : 0;
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
            repeat={ghostRepeat}
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

  // repeated player numbers step down the shade ramp, in placement order
  const repeats = playerRepeatIndex(board.tokens);

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
            <TokenGlyph
              token={t}
              scale={iconScale}
              screenDelta={screenDelta}
              repeat={repeats.get(t.id) ?? 0}
            />
            {/* mouse-only hover ring (see globals.css) */}
            <circle
              className="hover-ring"
              // outside the drawn icon even when the catchment is icon-sized
              r={Math.max(4.6 * iconScale, tokenHitR * 0.87)}
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
  const zoomControls = (
    <ZoomControls
      zoomedIn={zoomedIn}
      atMax={view.w <= baseView.w / MAX_ZOOM + 0.001}
      atMin={zoomView == null}
      panMode={panMode}
      onZoomIn={() => zoomToWidth(view.w / ZOOM_STEP)}
      onZoomOut={() => zoomToWidth(view.w * ZOOM_STEP)}
      onTogglePan={() => setPanMode((v) => !v)}
      onReset={() => setZoomView(null)}
    />
  );

  // How much of the window's width the canvas can have: a wide screen also
  // carries the 240px tool sidebar, a phone stacks the tools above instead.
  const gutterPx = wideScreen ? 300 : 32;

  // A portrait board is normally as wide as its column, which is right on a
  // phone. Forced into portrait on a wide screen it would run metres off the
  // bottom of the page, so there it's sized from its height instead.
  // zoomed on a wide screen: fill the column, whatever shape the board is
  const fillStyle: React.CSSProperties = {
    width: "100%",
    height: "calc(100dvh - 150px)",
  };
  const portraitStyle: React.CSSProperties = wideFrame
    ? fillStyle
    : wideScreen
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
      style={wideFrame ? fillStyle : {
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
              <Palette
                mode={mode}
                setMode={setMode}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
              />
            </div>
            {settingsPanel}
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
            <Palette
                mode={mode}
                setMode={setMode}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
              />
          </div>
          {settingsPanel}
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
