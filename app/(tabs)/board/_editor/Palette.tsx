"use client";

// The toolbar: Move, the People / Equipment / Arrows dropdowns, Distance and
// Erase. Collapsed into dropdowns so the whole palette fits a phone without
// sideways scrolling. Holds no state of its own — which tool is active and
// which dropdown is open both live in the editor.

import type { Dispatch, SetStateAction } from "react";
import { EraseIcon, MoveIcon } from "@/components/NavIcon";
import type { MovementType, TokenType } from "@/lib/types";
import { MOVEMENT_STYLE, TOKEN_LABELS, TokenGlyph } from "../BoardCanvas";
import {
  EQUIP_TOKENS,
  MOVEMENT_TYPES,
  PEOPLE_TOKENS,
  type Mode,
} from "./editorConstants";

export type MenuId = "people" | "equipment" | "arrows";

export default function Palette({
  mode,
  setMode,
  openMenu,
  setOpenMenu,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  openMenu: MenuId | null;
  setOpenMenu: Dispatch<SetStateAction<MenuId | null>>;
}) {
  const toolChip = (active: boolean) =>
    `flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 text-[10px] font-medium ${
      active
        ? "border-pitch bg-pitch text-white"
        : "border-stone-300 bg-white text-stone-600"
    }`;

  const tokenIcon = (t: TokenType) => (
    <svg viewBox="-5 -5 10 10" className="h-5 w-5">
      <TokenGlyph token={{ id: "icon", type: t, x: 0, y: 0, label: "1" }} />
    </svg>
  );

  const movementIcon = (m: MovementType) => (
    <svg viewBox="0 0 24 12" className="h-5 w-6 rounded bg-stone-100 ring-1 ring-stone-200">
      {m === "draw" ? (
        <path
          d="M3 8 Q7 2 11 7 T19 6"
          fill="none"
          stroke={MOVEMENT_STYLE[m].color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ) : (
        <>
          <line
            x1={3}
            y1={6}
            x2={17}
            y2={6}
            stroke={MOVEMENT_STYLE[m].color}
            strokeWidth={2}
            strokeDasharray={MOVEMENT_STYLE[m].dash
              ?.split(" ")
              .map((n) => Number(n) * 1.8)
              .join(" ")}
          />
          <polygon points="21,6 16,3.5 16,8.5" fill={MOVEMENT_STYLE[m].color} />
        </>
      )}
    </svg>
  );

  // Which tool each dropdown currently holds (drives its label + highlight).
  const activePerson =
    mode.kind === "place" && PEOPLE_TOKENS.includes(mode.token)
      ? mode.token
      : null;
  const activeEquip =
    mode.kind === "place" && EQUIP_TOKENS.includes(mode.token)
      ? mode.token
      : null;
  const activeArrow = mode.kind === "draw" ? mode.movement : null;

  const caret = (
    <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" aria-hidden>
      <path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // A palette dropdown: trigger chip + a panel of tool options below it.
  const dropdown = (
    id: "people" | "equipment" | "arrows",
    ariaLabel: string,
    fallbackLabel: string,
    triggerIcon: React.ReactNode,
    active: boolean,
    options: React.ReactNode
  ) => (
    <div className="relative">
      <button
        onClick={() => setOpenMenu((v) => (v === id ? null : id))}
        aria-expanded={openMenu === id}
        aria-label={ariaLabel}
        className={toolChip(active)}
      >
        {triggerIcon}
        <span className="flex items-center gap-0.5">
          {fallbackLabel}
          {caret}
        </span>
      </button>
      {openMenu === id && (
        <div className="absolute left-0 top-full z-30 mt-1 grid w-[172px] grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
          {options}
        </div>
      )}
    </div>
  );

  const placeOption = (t: TokenType) => (
    <button
      key={t}
      onClick={() => {
        setMode({ kind: "place", token: t });
        setOpenMenu(null);
      }}
      className={toolChip(mode.kind === "place" && mode.token === t)}
    >
      {tokenIcon(t)}
      {TOKEN_LABELS[t]}
    </button>
  );

  const arrowOption = (m: MovementType) => (
    <button
      key={m}
      onClick={() => {
        setMode({ kind: "draw", movement: m });
        setOpenMenu(null);
      }}
      className={toolChip(mode.kind === "draw" && mode.movement === m)}
    >
      {movementIcon(m)}
      {MOVEMENT_STYLE[m].label}
    </button>
  );

  return (
    <>
      <button
        onClick={() => {
          setMode({ kind: "move" });
          setOpenMenu(null);
        }}
        className={toolChip(mode.kind === "move")}
      >
        <MoveIcon className="h-5 w-5" />
        Move
      </button>

      {dropdown(
        "people",
        "People tools",
        activePerson ? TOKEN_LABELS[activePerson] : "People",
        tokenIcon(activePerson ?? "player"),
        activePerson != null,
        PEOPLE_TOKENS.map(placeOption)
      )}

      {dropdown(
        "equipment",
        "Equipment tools",
        activeEquip ? TOKEN_LABELS[activeEquip] : "Equipment",
        tokenIcon(activeEquip ?? "cone"),
        activeEquip != null,
        EQUIP_TOKENS.map(placeOption)
      )}

      {dropdown(
        "arrows",
        "Arrow tools",
        activeArrow ? MOVEMENT_STYLE[activeArrow].label : "Arrows",
        movementIcon(activeArrow ?? "run"),
        activeArrow != null,
        MOVEMENT_TYPES.map(arrowOption)
      )}

      <button
        onClick={() => {
          setMode({ kind: "measure" });
          setOpenMenu(null);
        }}
        className={toolChip(mode.kind === "measure")}
      >
        <svg viewBox="0 0 24 12" className="h-5 w-6">
          <line x1={3} y1={6} x2={21} y2={6} stroke="currentColor" strokeWidth={1.6} />
          <line x1={3} y1={2.5} x2={3} y2={9.5} stroke="currentColor" strokeWidth={1.6} />
          <line x1={21} y1={2.5} x2={21} y2={9.5} stroke="currentColor" strokeWidth={1.6} />
          <line x1={9} y1={4.5} x2={9} y2={7.5} stroke="currentColor" strokeWidth={1.2} />
          <line x1={15} y1={4.5} x2={15} y2={7.5} stroke="currentColor" strokeWidth={1.2} />
        </svg>
        Distance
      </button>

      <button
        onClick={() => {
          setMode({ kind: "erase" });
          setOpenMenu(null);
        }}
        className={toolChip(mode.kind === "erase")}
      >
        <EraseIcon className="h-5 w-5" />
        Erase
      </button>
    </>
  );
}
