"use client";

import { useEffect, useRef, useState } from "react";
import type { Board, Drill } from "@/lib/types";
import AnimatedBoard from "../board/AnimatedBoard";
import SpecDiagram from "@/components/drills/SpecDiagram";
import { TAG_BADGE_CLASSES, TAG_LABELS } from "../drills/tags";

/** Fullscreen drill-by-drill walkthrough for running a session at training. */
export default function PresentMode({
  drills,
  boards,
  onClose,
}: {
  drills: Drill[];
  boards: Map<string, Board>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rootRef.current?.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const drill = drills[index];
  if (!drill) return null;
  const board = drill.boardId ? boards.get(drill.boardId) : undefined;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-pitch-dark px-5 pb-5 pt-4 text-white"
    >
      <header className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-emerald-200">
          Drill {index + 1} of {drills.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="min-h-[48px] min-w-[48px] rounded-lg bg-white/10 text-lg font-bold"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 py-3">
        <h1 className="text-3xl font-bold">{drill.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {drill.durationMins} min
          </span>
          {drill.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${TAG_BADGE_CLASSES[tag]}`}
            >
              {TAG_LABELS[tag]}
            </span>
          ))}
        </div>
        {drill.diagramSpec ? (
          <SpecDiagram
            spec={drill.diagramSpec}
            name={drill.name}
            className="mx-auto w-full max-w-[280px] rounded-xl bg-white p-2"
          />
        ) : board ? (
          <AnimatedBoard
            board={board}
            className="mx-auto w-full max-w-[280px]"
          />
        ) : null}
        {drill.description && (
          <p className="text-lg leading-relaxed">{drill.description}</p>
        )}
        {drill.cues && (
          <p className="text-sm text-emerald-100">
            <span className="font-semibold">Cues:</span> {drill.cues}
          </p>
        )}
        {drill.equipment && (
          <p className="text-sm text-emerald-200">Gear: {drill.equipment}</p>
        )}
        {drill.easier && (
          <p className="text-sm">
            <span className="font-semibold text-sky-300">Easier:</span>{" "}
            {drill.easier}
          </p>
        )}
        {drill.harder && (
          <p className="text-sm">
            <span className="font-semibold text-amber-300">Harder:</span>{" "}
            {drill.harder}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="min-h-[56px] flex-1 rounded-xl bg-white/10 text-lg font-bold disabled:opacity-30"
        >
          ‹ Back
        </button>
        {index < drills.length - 1 ? (
          <button
            onClick={() => setIndex((i) => Math.min(drills.length - 1, i + 1))}
            className="min-h-[56px] flex-[2] rounded-xl bg-emerald-500 text-lg font-bold text-emerald-950"
          >
            Next drill ›
          </button>
        ) : (
          <button
            onClick={onClose}
            className="min-h-[56px] flex-[2] rounded-xl bg-amber-400 text-lg font-bold text-amber-950"
          >
            Finish session 🎉
          </button>
        )}
      </div>
    </div>
  );
}
