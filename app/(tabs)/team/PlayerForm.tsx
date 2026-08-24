"use client";

import { useState } from "react";
import type { Player, PlayerUnit } from "@/lib/types";

export interface PlayerFormData {
  name: string;
  notes: string;
  jersey?: number;
  position?: string;
  unit?: PlayerUnit;
}

export default function PlayerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Player;
  submitLabel: string;
  onSubmit: (data: PlayerFormData) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [jersey, setJersey] = useState(
    initial?.jersey != null ? String(initial.jersey) : ""
  );
  const [position, setPosition] = useState(initial?.position ?? "");
  const [unit, setUnit] = useState<PlayerUnit | "">(initial?.unit ?? "");
  const trimmed = name.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        const n = parseInt(jersey, 10);
        onSubmit({
          name: trimmed,
          notes: notes.trim(),
          jersey: Number.isFinite(n) ? n : undefined,
          position: position.trim() || undefined,
          unit: unit || undefined,
        });
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

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Position{" "}
          <span className="font-normal text-stone-400">(optional)</span>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Fly-half, Prop"
            className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
          />
        </label>
        <label className="flex w-36 flex-col gap-1 text-sm font-medium">
          Forwards / Backs
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as PlayerUnit | "")}
            className="min-h-[48px] rounded-lg border border-stone-300 bg-white px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
          >
            <option value="">—</option>
            <option value="forwards">Forwards</option>
            <option value="backs">Backs</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes <span className="font-normal text-stone-400">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering — big left boot, loves a run…"
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
