"use client";

import { useEffect, useRef, useState } from "react";
import type { Board, BoardMovement, BoardToken } from "@/lib/types";
import {
  MovementGlyph,
  PITCH_H,
  PITCH_W,
  Pitch,
  TokenGlyph,
  pointAlong,
} from "./BoardCanvas";

/**
 * Read-only board with a Play button that walks each token along the arrow
 * starting nearest it — so you can watch the drill unfold. Used by the drill
 * viewer and the session Present mode.
 */
export default function AnimatedBoard({
  board,
  className = "w-full",
}: {
  board: Board;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [anim, setAnim] = useState<Map<string, { x: number; y: number }> | null>(
    null
  );
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function play() {
    if (playing) return;
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
      setAnim(new Map(assignments.map((a) => [a.tokenId, pointAlong(a.movement, ease)])));
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          setAnim(null);
          setPlaying(false);
        }, 800);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }

  const canPlay = board.movements.some((m) => m.points.length >= 2);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        className="w-full rounded-xl"
        role="img"
        aria-label={`Diagram: ${board.name}`}
      >
        <Pitch />
        {board.movements.map((m) => (
          <MovementGlyph key={m.id} movement={m} />
        ))}
        {board.tokens.map((t) => {
          const pos = anim?.get(t.id) ?? t;
          return (
            <g key={t.id} transform={`translate(${pos.x} ${pos.y})`}>
              <TokenGlyph token={t} />
            </g>
          );
        })}
      </svg>
      {canPlay && (
        <button
          onClick={play}
          disabled={playing}
          aria-label="Play the drill"
          className="absolute bottom-3 left-1/2 flex min-h-[48px] -translate-x-1/2 items-center gap-2 rounded-full bg-pitch px-5 font-bold text-white shadow-lg disabled:opacity-60"
        >
          {playing ? "Playing…" : "▶ Play drill"}
        </button>
      )}
    </div>
  );
}
