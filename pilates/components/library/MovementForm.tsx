"use client";

import { useState } from "react";
import type { Movement, Discipline, Level, FocusArea, Equipment } from "@/lib/types";
import { DISCIPLINES, EQUIPMENT, FOCUS_AREAS, LEVELS } from "@/lib/types";

/** Textarea helper: one entry per line. */
function linesToList(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

export default function MovementForm({
  initial,
  onSave,
  onCancel,
  saving,
  submitLabel = "Save movement",
}: {
  initial: Movement;
  onSave: (m: Movement) => void;
  onCancel: () => void;
  saving?: boolean;
  submitLabel?: string;
}) {
  const [m, setM] = useState<Movement>(initial);
  const [cues, setCues] = useState(initial.cues.join("\n"));
  const [mods, setMods] = useState(initial.modifications.join("\n"));
  const [contra, setContra] = useState(initial.contraindications.join("\n"));
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [minutes, setMinutes] = useState(
    initial.defaultDurationSec ? String(Math.round(initial.defaultDurationSec / 60 * 10) / 10) : "",
  );

  function toggle<T extends string>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseFloat(minutes);
    onSave({
      ...m,
      name: m.name.trim(),
      cues: linesToList(cues),
      modifications: linesToList(mods),
      contraindications: linesToList(contra),
      tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      defaultDurationSec: Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : undefined,
      springs: m.discipline === "reformer" ? m.springs?.trim() || undefined : undefined,
      defaultReps: m.defaultReps?.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="name">Name*</label>
          <input id="name" required className="field" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="discipline">Discipline</label>
            <select id="discipline" className="field" value={m.discipline} onChange={(e) => setM({ ...m, discipline: e.target.value as Discipline })}>
              {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="level">Level</label>
            <select id="level" className="field" value={m.level} onChange={(e) => setM({ ...m, level: e.target.value as Level })}>
              {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">How to do it</label>
          <textarea id="description" rows={4} className="field" value={m.description} onChange={(e) => setM({ ...m, description: e.target.value })} placeholder="Setup, then the movement." />
        </div>
      </div>

      <div className="card space-y-3">
        <p className="label">Focus areas</p>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map((f) => (
            <ToggleChip key={f.id} on={m.focus.includes(f.id)} onClick={() => setM({ ...m, focus: toggle<FocusArea>(m.focus, f.id) })}>
              {f.label}
            </ToggleChip>
          ))}
        </div>
        <p className="label pt-2">Equipment</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((eq) => (
            <ToggleChip key={eq.id} on={m.equipment.includes(eq.id)} onClick={() => setM({ ...m, equipment: toggle<Equipment>(m.equipment, eq.id) })}>
              {eq.label}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="minutes">Typical minutes</label>
            <input id="minutes" inputMode="decimal" className="field" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="2" />
          </div>
          <div>
            <label className="label" htmlFor="reps">Reps</label>
            <input id="reps" className="field" value={m.defaultReps ?? ""} onChange={(e) => setM({ ...m, defaultReps: e.target.value })} placeholder="8–10 each side" />
          </div>
        </div>
        {m.discipline === "reformer" && (
          <div>
            <label className="label" htmlFor="springs">Springs</label>
            <input id="springs" className="field" value={m.springs ?? ""} onChange={(e) => setM({ ...m, springs: e.target.value })} placeholder="1 red + 1 blue" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="cues">Cues (one per line)</label>
          <textarea id="cues" rows={4} className="field" value={cues} onChange={(e) => setCues(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="mods">Modifications (one per line)</label>
          <textarea id="mods" rows={3} className="field" value={mods} onChange={(e) => setMods(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="contra">Cautions (one per line)</label>
          <textarea id="contra" rows={2} className="field" value={contra} onChange={(e) => setContra(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="tags">Tags (comma separated)</label>
          <input id="tags" className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="warm-up, classical" />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={saving || !m.name.trim()} className="btn-primary flex-1">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`chip ${on ? "bg-forest-deep text-mint border-forest-deep" : "bg-transparent text-ink border-ink/25"}`}
    >
      {children}
    </button>
  );
}
