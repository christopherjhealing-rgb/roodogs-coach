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

  const field =
    "min-h-[48px] w-full rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch";
  const labelCls = "flex flex-col gap-1.5 text-sm font-medium text-stone-700";

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
      className="flex flex-col gap-4"
    >
      <label className={labelCls}>
        Name
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name, e.g. Ruby"
          className={field}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelCls}>
          Jersey number{" "}
          <span className="font-normal text-stone-400">(optional)</span>
          <input
            type="text"
            inputMode="numeric"
            value={jersey}
            onChange={(e) =>
              setJersey(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            placeholder="—"
            className={field}
          />
        </label>
        <label className={labelCls}>
          Forwards / Backs{" "}
          <span className="font-normal text-stone-400">(optional)</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as PlayerUnit | "")}
            className={`${field} bg-white`}
          >
            <option value="">—</option>
            <option value="forwards">Forwards</option>
            <option value="backs">Backs</option>
          </select>
        </label>
      </div>

      <label className={labelCls}>
        Position <span className="font-normal text-stone-400">(optional)</span>
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="e.g. Fly-half, Prop"
          className={field}
        />
      </label>

      <label className={labelCls}>
        Notes <span className="font-normal text-stone-400">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering — big left boot, loves a run…"
          rows={2}
          className={`${field} py-2`}
        />
      </label>

      <div className="flex gap-2 pt-1">
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
          className="min-h-[48px] rounded-lg border border-stone-300 px-5 font-medium text-stone-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
