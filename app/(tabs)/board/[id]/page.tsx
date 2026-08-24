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

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragTokenId = useRef<string | null>(null);
  // sampled finger path while drawing an arrow — empty means not drawing
  const drawPoints = useRef<{ x: number; y: number }[]>([]);
  const [preview, setPreview] = useState<BoardMovement | null>(null);

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

  /** Apply a change to tokens/movements, recording undo history. */
  function commit(change: (b: Board) => Partial<Snapshot>) {
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
    persist({ ...board, ...change(board) });
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
    if (!board) return;
    const p = toPitch(e);
    if (mode.kind === "place") {
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
    if (!board) return;
    const p = toPitch(e);
    if (dragTokenId.current) {
      // move without recording history every pixel — snapshot was taken on grab
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
    if (mode.kind === "move") {
      e.stopPropagation();
      // snapshot once at grab time so the whole drag is one undo step
      commit((b) => ({ tokens: b.tokens }));
      dragTokenId.current = token.id;
      svgRef.current?.setPointerCapture(e.pointerId);
    } else if (mode.kind === "erase") {
      e.stopPropagation();
      commit((b) => ({ tokens: b.tokens.filter((t) => t.id !== token.id) }));
    }
    // in place/draw modes let the event fall through to the canvas
  }

  function onMovementPointerDown(e: React.PointerEvent, movement: BoardMovement) {
    if (mode.kind === "erase") {
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
      {mode.kind === "move" && "Drag anything to move it."}
      {mode.kind === "place" && `Tap the pitch to place a ${TOKEN_LABELS[mode.token].toLowerCase()}.`}
      {mode.kind === "draw" && `Drag on the pitch to draw a ${MOVEMENT_STYLE[mode.movement].label.toLowerCase()} arrow — curve it as you go.`}
      {mode.kind === "erase" && "Tap anything to rub it out."}
    </p>
  );

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
      {board.tokens.map((t) => (
        <g
          key={t.id}
          transform={`translate(${t.x} ${t.y})`}
          onPointerDown={(e) => onTokenPointerDown(e, t)}
        >
          {/* generous invisible hit area for cold thumbs */}
          <circle r={6} fill="transparent" />
          <TokenGlyph token={t} />
        </g>
      ))}
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
        <button
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          className="min-h-[44px] shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-600"
        >
          {fullscreen ? "✕ Exit" : "⛶ Full screen"}
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
