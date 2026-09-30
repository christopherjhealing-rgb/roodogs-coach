"use client";

// The + / − / ✋ / Reset stack on the canvas. It sits top-right, not bottom:
// the foot of a tall board sits under the fixed nav until you scroll, and
// zoom controls you have to go looking for are no use.

const zoomBtn =
  "flex h-10 w-10 items-center justify-center rounded-lg bg-black/55 text-lg font-bold text-white shadow disabled:opacity-30";

export default function ZoomControls({
  zoomedIn,
  atMax,
  atMin,
  panMode,
  onZoomIn,
  onZoomOut,
  onTogglePan,
  onReset,
}: {
  zoomedIn: boolean;
  /** Fully zoomed in — + is disabled. */
  atMax: boolean;
  /** Fully zoomed out — − is disabled. */
  atMin: boolean;
  panMode: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTogglePan: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
      <button
        onClick={onZoomIn}
        disabled={atMax}
        aria-label="Zoom in"
        title="Zoom in (+, or Ctrl and the wheel)"
        className={zoomBtn}
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        disabled={atMin}
        aria-label="Zoom out"
        title="Zoom out (−)"
        className={zoomBtn}
      >
        −
      </button>
      {zoomedIn && (
        <>
          <button
            onClick={onTogglePan}
            aria-pressed={panMode}
            aria-label="Move around the board"
            title="Drag to move around (or scroll, arrow keys, middle-button drag, two fingers)"
            className={`${zoomBtn} ${panMode ? "!bg-pitch" : ""}`}
          >
            ✋
          </button>
          <button
            onClick={onReset}
            className="rounded-lg bg-black/55 px-2.5 py-1 text-xs font-semibold text-white shadow"
          >
            Reset zoom
          </button>
        </>
      )}
    </div>
  );
}
