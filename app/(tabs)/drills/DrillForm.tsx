"use client";

import { useState } from "react";
import type { Board, Drill, DrillTag } from "@/lib/types";
import SpecDiagram from "@/components/drills/SpecDiagram";
import { ALL_TAGS, TAG_LABELS } from "./tags";

export default function DrillForm({
  initial,
  boards,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: Drill;
  boards: Board[];
  submitLabel: string;
  onSubmit: (drill: Omit<Drill, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tags, setTags] = useState<DrillTag[]>(initial?.tags ?? []);
  const [durationMins, setDurationMins] = useState(
    initial ? String(initial.durationMins) : "10"
  );
  const [equipment, setEquipment] = useState(initial?.equipment ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [boardId, setBoardId] = useState(initial?.boardId ?? "");
  const [easier, setEasier] = useState(initial?.easier ?? "");
  const [harder, setHarder] = useState(initial?.harder ?? "");
  const [cues, setCues] = useState(initial?.cues ?? "");
  const [players, setPlayers] = useState(initial?.players ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [setup, setSetup] = useState(initial?.setup ?? "");
  const [diagramSpec, setDiagramSpec] = useState(initial?.diagramSpec ?? "");
  const [showSpec, setShowSpec] = useState(false);

  const trimmedName = name.trim();
  const duration = Number(durationMins);
  const valid = trimmedName.length > 0 && Number.isFinite(duration) && duration > 0;

  function toggleTag(tag: DrillTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          name: trimmedName,
          tags,
          durationMins: Math.round(duration),
          equipment: equipment.trim(),
          description: description.trim(),
          boardId: boardId || undefined,
          easier: easier.trim() || undefined,
          harder: harder.trim() || undefined,
          cues: cues.trim() || undefined,
          players: players.trim() || undefined,
          area: area.trim() || undefined,
          setup: setup.trim() || undefined,
          diagramSpec: diagramSpec.trim() || undefined,
        });
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Corner Ball"
          className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm font-medium">
        <legend className="mb-1">Tags</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={on}
                className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${
                  on
                    ? "border-pitch bg-pitch text-white"
                    : "border-stone-300 bg-white text-stone-600"
                }`}
              >
                {TAG_LABELS[tag]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Duration (minutes)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={60}
          value={durationMins}
          onChange={(e) => setDurationMins(e.target.value)}
          className="min-h-[48px] w-28 rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Equipment <span className="font-normal text-stone-400">(optional)</span>
        <input
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="e.g. Cones, 1 ball per pair"
          className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="How it runs, coaching points, how to make it harder or easier"
          rows={3}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Coaching cues{" "}
        <span className="font-normal text-stone-400">(optional)</span>
        <textarea
          value={cues}
          onChange={(e) => setCues(e.target.value)}
          placeholder="Key points to call out, e.g. Ball in two hands, eyes up"
          rows={2}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Players <span className="font-normal text-stone-400">(optional)</span>
          <input
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            placeholder="e.g. 4 (2 v 2)"
            className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Area <span className="font-normal text-stone-400">(optional)</span>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. 3m x 20m channel"
            className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Cone set <span className="font-normal text-stone-400">(optional)</span>
        <input
          value={setup}
          onChange={(e) => setSetup(e.target.value)}
          placeholder="Worked out from the area — set it to group drills that share cones"
          className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Make it easier{" "}
        <span className="font-normal text-stone-400">(optional)</span>
        <input
          value={easier}
          onChange={(e) => setEasier(e.target.value)}
          placeholder="e.g. Walk pace, bigger grid, two-hand touch"
          className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Make it harder{" "}
        <span className="font-normal text-stone-400">(optional)</span>
        <input
          value={harder}
          onChange={(e) => setHarder(e.target.value)}
          placeholder="e.g. Add a defender, shrink the grid, weak hand only"
          className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>

      <fieldset className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm">
        <legend className="px-1 font-medium">Diagram</legend>
        {diagramSpec.trim() && !boardId && (
          <SpecDiagram
            spec={diagramSpec}
            name={trimmedName || "diagram"}
            className="mx-auto w-full max-w-[240px] rounded-lg border border-stone-200 bg-white p-1"
          />
        )}
        <label className="flex flex-col gap-1 font-medium">
          Use one of your whiteboard boards{" "}
          <span className="font-normal text-stone-400">
            (draw it on the Board tab — it replaces the animated diagram)
          </span>
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="min-h-[48px] rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
          >
            <option value="">
              {diagramSpec.trim()
                ? "No — keep the animated diagram"
                : "None — draw one on the Board tab first"}
            </option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {diagramSpec.trim() !== "" || showSpec ? (
          <div className="flex flex-col gap-1 font-medium">
            <button
              type="button"
              onClick={() => setShowSpec((v) => !v)}
              aria-expanded={showSpec}
              className="w-fit text-left text-sm font-medium text-pitch underline underline-offset-2"
            >
              {showSpec ? "Hide diagram text" : "Edit the animated diagram (advanced)"}
            </button>
            {showSpec && (
              <>
                <textarea
                  value={diagramSpec}
                  onChange={(e) => setDiagramSpec(e.target.value)}
                  rows={4}
                  spellCheck={false}
                  aria-label="Diagram text"
                  className="rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
                />
                <p className="font-normal text-stone-400">
                  Positions are 0–1 across and down. A player · D defender · C
                  coach · B ball · K cone · r run · p pass · k kick · w contact
                  · t caption — e.g. <code>A .5 .8 1;r .5 .8 .5 .3</code>. The
                  preview above updates as you type.
                </p>
              </>
            )}
          </div>
        ) : null}
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="min-h-[48px] flex-1 rounded-lg bg-pitch font-semibold text-white disabled:opacity-40"
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

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="min-h-[44px] w-fit self-center rounded-lg px-3 text-sm font-medium text-rose-600"
        >
          Delete this drill
        </button>
      )}
    </form>
  );
}
