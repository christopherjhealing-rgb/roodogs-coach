// The option rows that appear above the board for the selected item or
// the active tool — colour, cone shape, number, sequence, role and pen.
// Pure: each takes what it shows and what to call, and holds no state.

import type { ConeShape, PlayerRole } from "@/lib/types";
import {
  CONE_COLORS,
  CONE_SHAPES,
  ConeMarker,
  MOVEMENT_STYLE,
  PEN_WIDTHS,
  PLAYER_ROLES,
  PLAYER_SHADES,
} from "../BoardCanvas";
import { PLAYER_NUMBERS } from "./editorConstants";

// Shared option rows. There's a single row at the top of the toolbar: it
// edits the selected item when there is one, otherwise it sets the default
// for the active place tool — so a colour/number picker never appears twice.
export const colourRow = (activeFill: string, onPick: (fill: string) => void) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-xs font-medium text-stone-500">Colour:</span>
    {CONE_COLORS.map((c) => (
      <button
        key={c.fill}
        onClick={() => onPick(c.fill)}
        aria-label={`${c.name} cone`}
        aria-pressed={activeFill === c.fill}
        className={`h-9 w-9 rounded-full border-2 ${
          activeFill === c.fill ? "border-pitch" : "border-stone-200"
        }`}
        style={{ backgroundColor: c.fill }}
      />
    ))}
  </div>
);

/** Colour swatches plus the three marker shapes, drawn in that colour. */
export const coneRow = (
  activeFill: string,
  onFill: (fill: string) => void,
  activeShape: ConeShape,
  onShape: (shape: ConeShape) => void
) => (
  <div className="flex flex-wrap items-center gap-y-1.5">
    {colourRow(activeFill, onFill)}
    <div className="flex items-center gap-1.5 pl-2">
      <span className="text-xs font-medium text-stone-500">Shape:</span>
      {CONE_SHAPES.map((c) => (
        <button
          key={c.shape}
          onClick={() => onShape(c.shape)}
          aria-label={`${c.label} shape`}
          aria-pressed={activeShape === c.shape}
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white ${
            activeShape === c.shape ? "border-pitch" : "border-stone-200"
          }`}
        >
          <svg viewBox="-3.5 -3.5 7 7" className="h-6 w-6">
            <ConeMarker shape={c.shape} fill={activeFill} />
          </svg>
        </button>
      ))}
    </div>
  </div>
);

export const roleRow = (
  active: PlayerRole | undefined,
  onPick: (role: PlayerRole | undefined) => void
) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-xs font-medium text-stone-500">Role:</span>
    <button
      onClick={() => onPick(undefined)}
      aria-pressed={!active}
      className={`min-h-[36px] rounded-full border px-2.5 text-xs font-semibold ${
        !active
          ? "border-pitch bg-pitch text-white"
          : "border-stone-300 bg-white text-stone-600"
      }`}
    >
      No role
    </button>
    {PLAYER_ROLES.map((r) => (
      <button
        key={r.role}
        onClick={() => onPick(r.role)}
        aria-pressed={active === r.role}
        className="flex min-h-[32px] items-center gap-1 rounded-full border px-2 text-[11px] font-semibold"
        style={
          active === r.role
            ? { background: r.fill, color: r.text, borderColor: r.stroke }
            : { borderColor: "#d6d3d1", background: "#fff", color: "#57534e" }
        }
      >
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: r.fill, border: `1px solid ${r.stroke}` }}
        />
        {r.label}
      </button>
    ))}
  </div>
);

/** Where a player sits in a sequence — picks its shade by hand. */
export const seqRow = (active: number | undefined, onPick: (seq?: number) => void) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-xs font-medium text-stone-500">Sequence:</span>
    <button
      onClick={() => onPick(undefined)}
      aria-pressed={active === undefined}
      aria-label="Sequence auto"
      className={`min-h-[36px] rounded-full border px-2.5 text-xs font-semibold ${
        active === undefined
          ? "border-pitch bg-pitch text-white"
          : "border-stone-300 bg-white text-stone-600"
      }`}
    >
      Auto
    </button>
    {PLAYER_SHADES.map((sh, i) => (
      <button
        key={i}
        onClick={() => onPick(i)}
        aria-pressed={active === i}
        aria-label={`Sequence ${i + 1}`}
        className={`h-9 w-9 rounded-full border-2 text-sm font-bold ${
          active === i ? "border-pitch ring-2 ring-pitch/30" : "border-stone-200"
        }`}
        style={{ background: sh.fill, color: sh.text }}
      >
        {i + 1}
      </button>
    ))}
  </div>
);

export const numberRow = (
  isActive: (n: number) => boolean,
  onPick: (n: number) => void,
  leading: React.ReactNode,
  typed: string,
  onTyped: (label: string) => void
) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-xs font-medium text-stone-500">Number:</span>
    {leading}
    {PLAYER_NUMBERS.map((n) => (
      <button
        key={n}
        onClick={() => onPick(n)}
        aria-pressed={isActive(n)}
        className={`h-9 w-9 rounded-full border text-sm font-bold ${
          isActive(n)
            ? "border-pitch bg-pitch text-white"
            : "border-stone-300 bg-white text-stone-600"
        }`}
      >
        {n}
      </button>
    ))}
    <span className="pl-1 text-xs font-medium text-stone-500">Other:</span>
    <input
      value={typed}
      onChange={(e) =>
        onTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3))
      }
      placeholder="SH"
      aria-label="Other label"
      className="h-9 w-14 rounded-lg border border-stone-300 px-2 text-center text-sm font-bold uppercase outline-none focus:border-pitch"
    />
  </div>
);

/** Colour swatches and stroke weights for the pen. */
export const penRow = (
  activeColor: string,
  activeWidth: number,
  onColor: (c: string) => void,
  onWidth: (w: number) => void
) => (
  <div className="flex flex-wrap items-center gap-y-1.5">
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-stone-500">Pen:</span>
      {[{ fill: MOVEMENT_STYLE.draw.color, name: "Brass" }, ...CONE_COLORS].map((c) => (
        <button
          key={c.fill}
          onClick={() => onColor(c.fill)}
          aria-label={`${c.name} pen`}
          aria-pressed={activeColor === c.fill}
          className={`h-9 w-9 rounded-full border-2 ${
            activeColor === c.fill ? "border-pitch" : "border-stone-200"
          }`}
          style={{ backgroundColor: c.fill }}
        />
      ))}
    </div>
    <div className="flex items-center gap-1.5 pl-2">
      {PEN_WIDTHS.map((w) => (
        <button
          key={w.label}
          onClick={() => onWidth(w.width)}
          aria-pressed={activeWidth === w.width}
          className={`flex min-h-[36px] items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${
            activeWidth === w.width
              ? "border-pitch bg-pitch text-white"
              : "border-stone-300 bg-white text-stone-600"
          }`}
        >
          <svg viewBox="0 0 20 8" className="h-2 w-5">
            <line x1={2} y1={4} x2={18} y2={4} stroke="currentColor" strokeWidth={w.width * 2.2} strokeLinecap="round" />
          </svg>
          {w.label}
        </button>
      ))}
    </div>
  </div>
);
