"use client";

import { useEffect, useState } from "react";
import { newId, storage } from "@/lib/storage";
import { ensureSeedData } from "@/lib/ensureSeed";
import { coneSetup } from "@/lib/coneSetup";
import { useDataVersion } from "@/components/SyncProvider";
import type { Board, Drill, DrillTag, Session } from "@/lib/types";
import { BoardPreview } from "../board/BoardCanvas";
import SpecDiagram from "@/components/drills/SpecDiagram";
import DrillForm from "./DrillForm";
import DrillViewer from "./DrillViewer";
import { drillMatches } from "./search";
import { ALL_TAGS, TAG_BADGE_CLASSES, TAG_LABELS } from "./tags";

export default function DrillsPage() {
  const [drills, setDrills] = useState<Drill[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<DrillTag | "all">("all");
  const [query, setQuery] = useState("");
  const [setupFilter, setSetupFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Drill | null>(null);
  const dataVersion = useDataVersion();

  // Read after mount (no localStorage on the server); seed the starter
  // library and its diagram boards the first time the tab is opened.
  // Re-read when a cloud sync pulls newer data from another device.
  useEffect(() => {
    ensureSeedData();
    setDrills(storage.getDrills());
    setBoards(storage.getBoards());
    setSessions(storage.getSessions());
    setLoaded(true);
  }, [dataVersion]);

  function save(next: Drill[]) {
    setDrills(next);
    storage.setDrills(next);
  }

  function addDrill(data: Omit<Drill, "id">) {
    save([...drills, { id: newId(), ...data }]);
    setAdding(false);
  }

  function updateDrill(id: string, data: Omit<Drill, "id">) {
    // merge, so fields the form doesn't carry (level, source…) survive an edit
    save(drills.map((d) => (d.id === id ? { ...d, ...data } : d)));
    setEditingId(null);
  }

  function deleteDrill(drill: Drill) {
    if (!window.confirm(`Delete "${drill.name}"? This can't be undone.`)) return;
    save(drills.filter((d) => d.id !== drill.id));
    setEditingId(null);
  }

  /** Append the viewed drill to a session (null = start a new one for today).
   *  Returns the session's id so the viewer can show where it went. */
  function addToSession(sessionId: string | null, drill: Drill): string {
    let next: Session[];
    let targetId: string;
    if (sessionId === null) {
      targetId = newId();
      next = [
        ...sessions,
        {
          id: targetId,
          date: new Date().toISOString().slice(0, 10),
          drillIds: [drill.id],
          notes: "",
        },
      ];
    } else {
      targetId = sessionId;
      next = sessions.map((s) =>
        s.id === sessionId && !s.drillIds.includes(drill.id)
          ? { ...s, drillIds: [...s.drillIds, drill.id] }
          : s
      );
    }
    setSessions(next);
    storage.setSessions(next);
    return targetId;
  }

  const setupOptions = [...new Set(drills.map((d) => coneSetup(d)))].sort(
    (a, b) => a.localeCompare(b)
  );

  const visible = drills
    .filter((d) => filter === "all" || d.tags.includes(filter))
    .filter((d) => setupFilter === "all" || coneSetup(d) === setupFilter)
    .filter((d) => drillMatches(d, query))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drills</h1>
          {loaded && (
            <p className="text-sm text-stone-500">
              {visible.length} {visible.length === 1 ? "drill" : "drills"}
              {filter !== "all" && ` · ${TAG_LABELS[filter]}`}
            </p>
          )}
        </div>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="min-h-[48px] rounded-lg bg-pitch px-4 font-semibold text-white"
          >
            + Add drill
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search drills…"
          aria-label="Search drills"
          className="min-h-[48px] min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
        <select
          value={setupFilter}
          onChange={(e) => setSetupFilter(e.target.value)}
          aria-label="Filter by cone set"
          className="min-h-[48px] max-w-[46%] rounded-lg border border-stone-300 bg-white px-2 text-sm outline-none focus:border-pitch"
        >
          <option value="all">All cone sets</option>
          {setupOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          <button
            onClick={() => setFilter("all")}
            className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${
              filter === "all"
                ? "border-pitch bg-pitch text-white"
                : "border-stone-300 bg-white text-stone-600"
            }`}
          >
            All
          </button>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${
                filter === tag
                  ? "border-pitch bg-pitch text-white"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              {TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </div>

      {adding && (
        <div className="w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">New drill</h2>
          <DrillForm
            boards={boards}
            submitLabel="Add to library"
            onSubmit={addDrill}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {loaded && visible.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <span className="text-3xl" aria-hidden>
            🏉
          </span>
          <p className="text-sm text-stone-500">
            No drills with this tag yet — add one or pick another tag.
          </p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((drill) => {
          const board = drill.boardId
            ? boards.find((b) => b.id === drill.boardId)
            : undefined;
          return editingId === drill.id ? (
            <li
              key={drill.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <h2 className="mb-3 font-semibold">Edit drill</h2>
              <DrillForm
                initial={drill}
                boards={boards}
                submitLabel="Save"
                onSubmit={(data) => updateDrill(drill.id, data)}
                onCancel={() => setEditingId(null)}
                onDelete={() => deleteDrill(drill)}
              />
            </li>
          ) : (
            <li
              key={drill.id}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
            >
              <button
                onClick={() => {
                  setEditingId(drill.id);
                  setAdding(false);
                }}
                className="flex w-full flex-col gap-1.5 px-4 py-3 text-left active:bg-stone-50"
              >
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span className="font-semibold">{drill.name}</span>
                  <span className="shrink-0 text-sm text-stone-500">
                    {drill.durationMins} min
                  </span>
                </span>
                {drill.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {drill.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TAG_BADGE_CLASSES[tag]}`}
                      >
                        {TAG_LABELS[tag]}
                      </span>
                    ))}
                  </span>
                )}
                {drill.description && (
                  <span className="text-sm text-stone-600">
                    {drill.description}
                  </span>
                )}
                {drill.equipment && (
                  <span className="text-xs text-stone-400">
                    Gear: {drill.equipment}
                  </span>
                )}
                <span className="text-xs text-stone-400">
                  <span aria-hidden>🔺</span> {coneSetup(drill)}
                </span>
                {drill.easier && (
                  <span className="text-xs text-stone-500">
                    <span className="font-semibold text-sky-700">Easier:</span>{" "}
                    {drill.easier}
                  </span>
                )}
                {drill.harder && (
                  <span className="text-xs text-stone-500">
                    <span className="font-semibold text-amber-700">
                      Harder:
                    </span>{" "}
                    {drill.harder}
                  </span>
                )}
              </button>
              {(board || drill.diagramSpec) && (
                <button
                  onClick={() => setViewing(drill)}
                  className="relative block w-full border-t border-stone-100 bg-stone-50 p-3 active:bg-stone-100"
                  aria-label={`Watch ${drill.name}`}
                >
                  {board ? (
                    // a coach-drawn board overrides the library diagram
                    <BoardPreview
                      board={board}
                      className="mx-auto w-36 rounded-lg border border-stone-200"
                    />
                  ) : (
                    <SpecDiagram
                      spec={drill.diagramSpec!}
                      name={drill.name}
                      animate={false}
                      className="mx-auto w-40 rounded-lg border border-stone-200 bg-white p-1"
                    />
                  )}
                  <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-pitch px-3 py-1 text-xs font-bold text-white shadow">
                    ▶ Watch
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {viewing && (
        <DrillViewer
          drill={viewing}
          board={
            viewing.boardId
              ? boards.find((b) => b.id === viewing.boardId)
              : undefined
          }
          sessions={sessions}
          onAddToSession={(sessionId) => addToSession(sessionId, viewing)}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
