"use client";

// The key under the board: any player roles in use on this board (so the
// colours explain themselves), then every arrow style.

import type { BoardToken } from "@/lib/types";
import { MOVEMENT_STYLE, PLAYER_ROLES } from "../BoardCanvas";
import { MOVEMENT_TYPES } from "./editorConstants";

export default function BoardLegend({ tokens }: { tokens: BoardToken[] }) {
  const rolesInUse = PLAYER_ROLES.filter((r) =>
    tokens.some((t) => t.type === "player" && t.role === r.role)
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
      {rolesInUse.map((r) => (
        <span key={r.role} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: r.fill, border: `1px solid ${r.stroke}` }}
          />
          {r.label}
        </span>
      ))}
      {MOVEMENT_TYPES.map((m) => (
        <span key={m} className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 8" className="h-2.5 w-7 rounded-sm bg-stone-100 ring-1 ring-stone-200">
            <line
              x1={2}
              y1={4}
              x2={22}
              y2={4}
              stroke={MOVEMENT_STYLE[m].color}
              strokeWidth={2}
              strokeDasharray={MOVEMENT_STYLE[m].dash
                ?.split(" ")
                .map((n) => Number(n) * 1.8)
                .join(" ")}
            />
          </svg>
          {MOVEMENT_STYLE[m].label}
        </span>
      ))}
    </div>
  );
}
