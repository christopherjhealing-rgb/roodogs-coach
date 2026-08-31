"use client";

import { useState } from "react";
import type { Board, Drill, Session } from "@/lib/types";
import AnimatedBoard from "../board/AnimatedBoard";
import SpecDiagram from "@/components/drills/SpecDiagram";
import { coneSetup } from "@/lib/coneSetup";
import { TAG_BADGE_CLASSES, TAG_LABELS } from "./tags";

const LEVEL_LABEL = {
  u9: "U10 ready",
  mod: "U10 with tweaks",
  older: "Older juniors",
} as const;

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Fullscreen look at one drill: big playable diagram plus the detail. */
export default function DrillViewer({
  drill,
  board,
  sessions = [],
  onAddToSession,
  onClose,
}: {
  drill: Drill;
  board?: Board;
  sessions?: Session[];
  /** Add this drill to a session (null = start a new one); returns its id. */
  onAddToSession?: (sessionId: string | null) => string;
  onClose: () => void;
}) {
  // which session this drill was just added to, for the ✓ feedback
  const [addedTo, setAddedTo] = useState<string | null>(null);
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

        {board ? (
          // a coach-drawn board overrides the library diagram
          <AnimatedBoard board={board} className="mx-auto w-full max-w-xs" />
        ) : drill.diagramSpec ? (
          <SpecDiagram
            spec={drill.diagramSpec}
            name={drill.name}
            className="mx-auto w-full max-w-xs rounded-lg bg-white p-1"
          />
        ) : (
          <p className="rounded-lg bg-stone-100 px-3 py-6 text-center text-sm text-stone-500">
            No diagram for this drill yet — add one on the Board tab and link
            it in the drill.
          </p>
        )}

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
          {drill.players && <span>Players: {drill.players}</span>}
          {drill.area && <span>Area: {drill.area}</span>}
          <span>
            <span aria-hidden>🔺</span> {coneSetup(drill)}
          </span>
          {drill.level && <span>{LEVEL_LABEL[drill.level]}</span>}
        </p>

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

        {onAddToSession && (
          <section className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <h3 className="text-sm font-semibold">Add to a session</h3>
            <div className="flex flex-wrap gap-1.5">
              {sessions
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 4)
                .map((s) => {
                  const added = addedTo === s.id;
                  const already = s.drillIds.includes(drill.id) && !added;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setAddedTo(onAddToSession(s.id))}
                      disabled={added || already}
                      className={`min-h-[44px] rounded-full border px-3 text-sm font-medium ${
                        added || already
                          ? "border-pitch bg-emerald-50 text-pitch"
                          : "border-stone-300 bg-white text-stone-600"
                      }`}
                    >
                      {added ? "✓ Added · " : already ? "✓ In · " : ""}
                      {formatDate(s.date)}
                    </button>
                  );
                })}
              <button
                onClick={() => setAddedTo(onAddToSession(null))}
                className="min-h-[44px] rounded-full border border-pitch px-3 text-sm font-semibold text-pitch"
              >
                ＋ New session
              </button>
            </div>
            {addedTo && (
              <p className="text-xs text-emerald-700">
                Added — find it on the Sessions tab.
              </p>
            )}
          </section>
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
