"use client";

import { useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/types";
import {
  MovementGlyph,
  PITCH_H,
  PITCH_W,
  Pitch,
  TokenGlyph,
  surfaceFor,
} from "./BoardCanvas";
import { canPlay as boardCanPlay, runSequentialPlay } from "./boardPlay";

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
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  function play() {
    if (playing) return;
    setPlaying(true);
    cancelRef.current = runSequentialPlay(board, setAnim, () => {
      setAnim(null);
      setPlaying(false);
    });
  }

  const canPlay = boardCanPlay(board);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        className="w-full rounded-xl"
        role="img"
        aria-label={`Diagram: ${board.name}`}
      >
        <Pitch variant={surfaceFor(board)} />
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
