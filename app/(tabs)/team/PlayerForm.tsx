"use client";

import { useState } from "react";

export default function PlayerForm({
  initialName = "",
  initialNotes = "",
  initialJersey,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialNotes?: string;
  initialJersey?: number;
  submitLabel: string;
  onSubmit: (name: string, notes: string, jersey?: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [jersey, setJersey] = useState(
    initialJersey != null ? String(initialJersey) : ""
  );
  const trimmed = name.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        const n = parseInt(jersey, 10);
        onSubmit(trimmed, notes.trim(), Number.isFinite(n) ? n : undefined);
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name, e.g. Ruby"
            className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
          />
        </label>
        <label className="flex w-24 flex-col gap-1 text-sm font-medium">
          Jersey <span className="font-normal text-stone-400">#</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
            placeholder="—"
            className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes <span className="font-normal text-stone-400">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering — favourite position, big left boot…"
          rows={2}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!trimmed}
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
    </form>
  );
}
