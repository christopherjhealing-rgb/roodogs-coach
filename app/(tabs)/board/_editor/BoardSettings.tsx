"use client";

// The grid-step chips (shown whenever grid lock is on) and the board-size /
// icon-size panel (behind the Size button, or with the Distance tool, where
// the width matters). Grid lock is on by default, so its chips are a
// permanent fixture; size and icons stay tucked away so a phone doesn't lose
// two rows of board to controls it rarely touches.
//
// Display only: what happens on a change — validation, the one-undo-step-
// per-edit rule — lives in the editor and arrives as callbacks.

import { GRID_STEPS_M } from "../BoardCanvas";
import { ICON_SIZES } from "./editorConstants";

const chip = (on: boolean) =>
  `min-h-[36px] rounded-full border px-2.5 font-semibold ${
    on ? "border-pitch bg-pitch text-white" : "border-stone-300 bg-white text-stone-600"
  }`;

function SizeInput({
  value,
  setValue,
  label,
  apply,
  onFocus,
}: {
  value: string;
  setValue: (v: string) => void;
  label: string;
  apply: (n: number) => void;
  onFocus: () => void;
}) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onFocus={onFocus}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
        setValue(v);
        const num = parseInt(v, 10);
        if (Number.isFinite(num)) apply(num);
      }}
      aria-label={label}
      className="min-h-[36px] w-14 rounded-lg border border-stone-300 px-2 text-center text-sm outline-none focus:border-pitch"
    />
  );
}

export default function BoardSettings({
  snap,
  gridStepM,
  onGridStep,
  showSizePanel,
  widthStr,
  lengthStr,
  setWidthStr,
  setLengthStr,
  onSize,
  onSizeFocus,
  iconScale,
  onIconScale,
  offBoard,
}: {
  snap: boolean;
  gridStepM: number;
  onGridStep: (m: number) => void;
  showSizePanel: boolean;
  widthStr: string;
  lengthStr: string;
  setWidthStr: (v: string) => void;
  setLengthStr: (v: string) => void;
  /** Width and length are edited as a pair. */
  onSize: (widthM: number, lengthM: number) => void;
  /** A size box gained focus — the start of one undoable edit. */
  onSizeFocus: () => void;
  iconScale: number;
  onIconScale: (scale: number) => void;
  /** Icons sitting past the end of a shortened board. */
  offBoard: number;
}) {
  return (
    <>
      {snap && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
          <span className="font-medium text-stone-500">Grid:</span>
          {GRID_STEPS_M.map((m) => (
            <button
              key={m}
              onClick={() => onGridStep(m)}
              aria-pressed={gridStepM === m}
              className={chip(gridStepM === m)}
            >
              {m} m
            </button>
          ))}
        </div>
      )}
      {showSizePanel && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
          <span className="font-medium text-stone-500">Board:</span>
          <SizeInput
            value={widthStr}
            setValue={setWidthStr}
            label="Board width in metres"
            apply={(num) => onSize(num, parseInt(lengthStr, 10))}
            onFocus={onSizeFocus}
          />
          <span className="text-stone-500">m wide ×</span>
          <SizeInput
            value={lengthStr}
            setValue={setLengthStr}
            label="Board length in metres"
            apply={(num) => onSize(parseInt(widthStr, 10), num)}
            onFocus={onSizeFocus}
          />
          <span className="text-stone-500">m long</span>
          <span className="pl-1 font-medium text-stone-500">Icons:</span>
          {ICON_SIZES.map((sz) => (
            <button
              key={sz.label}
              onClick={() => onIconScale(sz.scale)}
              aria-pressed={iconScale === sz.scale}
              aria-label={`${sz.label} icons`}
              className={chip(iconScale === sz.scale)}
            >
              {sz.label}
            </button>
          ))}
          {offBoard > 0 && (
            <span className="basis-full font-medium text-amber-700">
              {offBoard} {offBoard === 1 ? "icon sits" : "icons sit"} past the end
              — lengthen the board to bring{" "}
              {offBoard === 1 ? "it" : "them"} back. Nothing has been deleted.
            </span>
          )}
        </div>
      )}
    </>
  );
}
