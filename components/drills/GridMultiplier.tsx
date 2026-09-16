"use client";

import { useState } from "react";
import { gridPlan } from "@/lib/gridPlan";
import type { Drill } from "@/lib/types";

const COUNTS = [1, 2, 3, 4, 5, 6];

/**
 * "Run it on more grids" — works out how many copies of a drill's layout the
 * squad needs and lays them out side by side, so nobody queues. The caller
 * supplies the tile (a spec diagram or a whiteboard preview).
 */
export default function GridMultiplier({
  drill,
  squadSize,
  renderTile,
  dark = false,
}: {
  drill: Drill;
  squadSize: number;
  renderTile: (index: number) => React.ReactNode;
  dark?: boolean;
}) {
  const [override, setOverride] = useState<number | null>(null);
  const plan = gridPlan(drill, squadSize, override ?? undefined);

  // whole-squad games (Any / Whole group / two teams) don't split into grids
  if (!plan.canMultiply) return null;

  const auto = override === null;
  const tileCols =
    plan.grids === 1
      ? "grid-cols-1"
      : plan.grids === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  return (
    <section
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        dark ? "border-white/20 bg-white/5" : "border-stone-200 bg-stone-50"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className={`text-sm font-semibold ${dark ? "text-white" : ""}`}>
          Run it on more grids
        </h3>
        <p className={`text-xs ${dark ? "text-emerald-200" : "text-stone-500"}`}>
          {squadSize} {squadSize === 1 ? "kid" : "kids"} · {plan.perGrid} per
          grid
          {plan.conesEach > 0 && ` · ${plan.conesTotal} cones`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOverride(null)}
          aria-pressed={auto}
          className={`min-h-[36px] rounded-full border px-2.5 text-xs font-semibold ${
            auto
              ? "border-pitch bg-pitch text-white"
              : dark
                ? "border-white/30 bg-transparent text-white"
                : "border-stone-300 bg-white text-stone-600"
          }`}
        >
          Auto
        </button>
        {COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setOverride(n)}
            aria-pressed={!auto && plan.grids === n}
            aria-label={`${n} grids`}
            className={`h-9 w-9 rounded-full border text-sm font-bold ${
              !auto && plan.grids === n
                ? "border-pitch bg-pitch text-white"
                : dark
                  ? "border-white/30 bg-transparent text-white"
                  : "border-stone-300 bg-white text-stone-600"
            }`}
          >
            ×{n}
          </button>
        ))}
      </div>

      <p className={`text-xs ${dark ? "text-emerald-100" : "text-stone-600"}`}>
        Set up <strong>{plan.grids}</strong>{" "}
        {plan.grids === 1 ? "grid" : "grids"} side by side
        {plan.conesEach > 0 && (
          <>
            {" "}
            — {plan.conesEach} cones each, <strong>{plan.conesTotal}</strong> all
            up
          </>
        )}
        {plan.spare > 0 && (
          <>
            {" "}
            · {plan.spare} {plan.spare === 1 ? "kid" : "kids"} spare — rotate
            them in
          </>
        )}
      </p>

      <div className={`grid gap-2 ${tileCols}`}>
        {Array.from({ length: plan.grids }, (_, i) => (
          <div
            key={i}
            className={`rounded-lg border p-1 ${
              dark ? "border-white/15 bg-white" : "border-stone-200 bg-white"
            }`}
          >
            <p className="pb-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-stone-400">
              Grid {i + 1}
            </p>
            {renderTile(i)}
          </div>
        ))}
      </div>
    </section>
  );
}
