"use client";

import type { Board, Drill } from "@/lib/types";
import AnimatedBoard from "../board/AnimatedBoard";
import SpecDiagram from "@/components/drills/SpecDiagram";
import { TAG_BADGE_CLASSES, TAG_LABELS } from "./tags";

const LEVEL_LABEL = {
  u9: "U10 ready",
  mod: "U10 with tweaks",
  older: "Older juniors",
} as const;

/** Fullscreen look at one drill: big playable diagram plus the detail. */
export default function DrillViewer({
  drill,
  board,
  onClose,
}: {
  drill: Drill;
  board?: Board;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl bg-white p-5 shadow-xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{drill.name}</h2>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                {drill.durationMins} min
              </span>
              {drill.tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${TAG_BADGE_CLASSES[tag]}`}
                >
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] rounded-lg border border-stone-300 text-lg font-bold text-stone-500"
          >
            ✕
          </button>
        </header>

        {drill.diagramSpec ? (
          <SpecDiagram
            spec={drill.diagramSpec}
            name={drill.name}
            className="mx-auto w-full max-w-xs rounded-lg bg-white p-1"
          />
        ) : board ? (
          <AnimatedBoard board={board} className="mx-auto w-full max-w-xs" />
        ) : (
          <p className="rounded-lg bg-stone-100 px-3 py-6 text-center text-sm text-stone-500">
            No diagram for this drill yet — add one on the Board tab and link
            it in the drill.
          </p>
        )}

        {(drill.players || drill.area || drill.level) && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            {drill.players && <span>Players: {drill.players}</span>}
            {drill.area && <span>Area: {drill.area}</span>}
            {drill.level && <span>{LEVEL_LABEL[drill.level]}</span>}
          </p>
        )}

        {drill.description && (
          <p className="text-sm leading-relaxed text-stone-700">
            {drill.description}
          </p>
        )}
        {drill.cues && (
          <p className="text-sm text-stone-700">
            <span className="font-semibold text-pitch">Coaching cues:</span>{" "}
            {drill.cues}
          </p>
        )}
        {drill.equipment && (
          <p className="text-sm text-stone-500">Gear: {drill.equipment}</p>
        )}
        {drill.easier && (
          <p className="text-sm text-stone-700">
            <span className="font-semibold text-sky-700">Easier:</span>{" "}
            {drill.easier}
          </p>
        )}
        {drill.harder && (
          <p className="text-sm text-stone-700">
            <span className="font-semibold text-amber-700">Harder:</span>{" "}
            {drill.harder}
          </p>
        )}
        {drill.source && (
          <p className="text-xs text-stone-400">
            Source:{" "}
            {drill.sourceUrl ? (
              <a
                href={drill.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {drill.source}
              </a>
            ) : (
              drill.source
            )}
          </p>
        )}

        <button
          onClick={onClose}
          className="min-h-[48px] rounded-lg bg-pitch font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
