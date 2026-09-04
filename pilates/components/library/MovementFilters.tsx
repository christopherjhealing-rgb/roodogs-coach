"use client";

import type { MovementFilter } from "@/lib/search";
import { DISCIPLINES, FOCUS_AREAS, LEVELS } from "@/lib/types";

export default function MovementFilters({
  value,
  onChange,
  compact = false,
}: {
  value: MovementFilter;
  onChange: (f: MovementFilter) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      <input
        type="search"
        className="field"
        placeholder="Search movements, cues, tags…"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        aria-label="Search movements"
      />
      <div className="flex flex-wrap gap-2">
        <Chip on={value.discipline === "all"} onClick={() => onChange({ ...value, discipline: "all" })}>
          All
        </Chip>
        {DISCIPLINES.map((d) => (
          <Chip key={d.id} on={value.discipline === d.id} onClick={() => onChange({ ...value, discipline: d.id })}>
            {d.label}
          </Chip>
        ))}
        <Chip on={value.mineOnly} onClick={() => onChange({ ...value, mineOnly: !value.mineOnly })}>
          Mine
        </Chip>
      </div>
      {!compact && (
        <div className="grid grid-cols-2 gap-2">
          <select
            className="field py-2"
            value={value.level}
            onChange={(e) => onChange({ ...value, level: e.target.value as MovementFilter["level"] })}
            aria-label="Level"
          >
            <option value="all">Any level</option>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <select
            className="field py-2"
            value={value.focus}
            onChange={(e) => onChange({ ...value, focus: e.target.value as MovementFilter["focus"] })}
            aria-label="Focus area"
          >
            <option value="all">Any focus</option>
            {FOCUS_AREAS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={on ? "chip-on" : "chip-off"}>
      {children}
    </button>
  );
}
