"use client";

import { useState } from "react";
import type { Drill, Session } from "@/lib/types";
import { coneSetup } from "@/lib/coneSetup";
import { drillMatches } from "../drills/search";
import { TAG_BADGE_CLASSES, TAG_LABELS } from "../drills/tags";

export const TARGET_MINS = 60;

export default function SessionBuilder({
  initial,
  drills,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Session;
  drills: Drill[];
  submitLabel: string;
  onSubmit: (data: Omit<Session, "id">) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [drillIds, setDrillIds] = useState<string[]>(initial?.drillIds ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [query, setQuery] = useState("");
  // drill currently being dragged up or down the plan
  const [dragId, setDragId] = useState<string | null>(null);

  const byId = new Map(drills.map((d) => [d.id, d]));
  const chosen = drillIds
    .map((id) => byId.get(id))
    .filter((d): d is Drill => d !== undefined);
  const totalMins = chosen.reduce((sum, d) => sum + d.durationMins, 0);
  const available = drills
    .filter((d) => !drillIds.includes(d.id))
    .filter((d) => drillMatches(d, query))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group the library by cone set, so drills that share a layout can be
  // chained without moving cones. Biggest groups first.
  const groups = new Map<string, Drill[]>();
  for (const d of available) {
    const key = coneSetup(d);
    const list = groups.get(key);
    if (list) list.push(d);
    else groups.set(key, [d]);
  }
  const groupedAvailable = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
  );

  function move(index: number, delta: -1 | 1) {
    const next = [...drillIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDrillIds(next);
  }

  /** Reorder by drag: drop the dragged drill into the slot of the row
   *  under the finger. Same handle pattern as the Team tab's roster. */
  function moveTo(fromId: string, overId: string) {
    if (fromId === overId) return;
    const ids = drillIds.filter((id) => id !== fromId);
    const at = ids.indexOf(overId);
    if (at < 0) return;
    ids.splice(at, 0, fromId);
    setDrillIds(ids);
  }

  function onHandlePointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    const row = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => (el as HTMLElement).closest?.("[data-did]"))
      .find(Boolean) as HTMLElement | undefined;
    const overId = row?.dataset.did;
    if (overId && overId !== dragId) moveTo(dragId, overId);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ date, drillIds, notes: notes.trim() });
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <div
        className={`sticky top-0 z-10 rounded-lg px-3 py-2 text-sm font-semibold ${
          totalMins > TARGET_MINS + 10
            ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-900"
        }`}
      >
        {totalMins} min planned · aiming for about {TARGET_MINS}
      </div>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-sm font-medium">
          Session plan
          {chosen.length > 1 && (
            <span className="pl-2 font-normal text-stone-400">
              drag ⠿ to reorder
            </span>
          )}
        </h3>
        {chosen.length === 0 && (
          <p className="rounded-lg border border-dashed border-stone-300 px-3 py-4 text-center text-sm text-stone-500">
            Nothing picked yet — tap drills below to build the session.
          </p>
        )}
        <ul className="flex flex-col gap-1.5">
          {chosen.map((drill, i) => (
            <li
              key={drill.id}
              data-did={drill.id}
              className={`flex items-center gap-2 rounded-lg border bg-stone-50 py-2 pr-3 transition-opacity ${
                dragId === drill.id
                  ? "border-pitch opacity-60"
                  : "border-stone-200"
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => onHandlePointerDown(e, drill.id)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={() => setDragId(null)}
                onPointerCancel={() => setDragId(null)}
                onKeyDown={(e) => {
                  // drag needs a pointer, so keep the keyboard route open
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    move(i, -1);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    move(i, 1);
                  }
                }}
                aria-label={`Reorder ${drill.name} — drag, or use the arrow keys`}
                className="-my-2 flex w-9 shrink-0 cursor-grab touch-none items-center justify-center self-stretch rounded-l-lg border-r border-stone-200 text-stone-300 hover:text-pitch active:cursor-grabbing"
              >
                ⠿
              </button>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {i + 1}. {drill.name}
                </span>
                <span className="text-xs text-stone-500">
                  {drill.durationMins} min
                  {i > 0 &&
                    coneSetup(chosen[i - 1]) === coneSetup(drill) && (
                      <span className="font-medium text-emerald-700">
                        {" "}
                        · same cones ✓
                      </span>
                    )}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setDrillIds(drillIds.filter((id) => id !== drill.id))
                }
                aria-label={`Remove ${drill.name}`}
                className="min-h-[44px] min-w-[44px] rounded-lg font-semibold text-rose-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-sm font-medium">Drill library</h3>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search drills…"
          aria-label="Search the drill library"
          className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
        {available.length === 0 && (
          <p className="rounded-lg border border-dashed border-stone-300 px-3 py-4 text-center text-sm text-stone-500">
            No drills match — try a different search.
          </p>
        )}
        <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
          {groupedAvailable.map(([setupName, group]) => (
            <li key={setupName}>
              <h4 className="sticky top-0 bg-white py-1 text-xs font-bold uppercase tracking-wide text-stone-400">
                <span aria-hidden>🔺</span> {setupName} ({group.length})
              </h4>
              <ul className="flex flex-col gap-1.5">
                {group.map((drill) => (
                  <li key={drill.id}>
                    <button
                      type="button"
                      onClick={() => setDrillIds([...drillIds, drill.id])}
                      className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left active:bg-stone-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {drill.name}
                        </span>
                        <span className="flex flex-wrap gap-1 pt-0.5">
                          {drill.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`rounded-full px-1.5 text-[10px] font-medium ${TAG_BADGE_CLASSES[tag]}`}
                            >
                              {TAG_LABELS[tag]}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-stone-500">
                        + {drill.durationMins} min
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes <span className="font-normal text-stone-400">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Focus for the night, who to keep an eye on…"
          rows={2}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          className="min-h-[48px] flex-1 rounded-lg bg-pitch font-semibold text-white"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] rounded-lg border border-stone-300 px-4 font-medium text-stone-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
