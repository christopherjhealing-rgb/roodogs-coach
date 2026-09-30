"use client";

// Zoom and pan for the board editor: pinch, the +/− buttons, Ctrl/⌘ + wheel,
// the keys, the hand tool and middle-button drag all come through here.
//
// Zoom drives the SVG viewBox rather than a CSS transform, so pointer↔pitch
// maths stays exact at any zoom. The stored zoom is an unclamped intent —
// x, y and width — and the frame's height and the clamping are derived at
// render from the frame's aspect. That aspect follows the *element* once
// zoomed on a wide screen, so the canvas fills the column instead of staying
// a narrow board-shaped box. Everything stores intent; one place decides
// what's shown, so the routes can't drift apart.

import { useEffect, useRef, useState, type RefObject } from "react";
import { PITCH_W } from "../BoardCanvas";
import { MAX_ZOOM, type Pt } from "./editorConstants";

export type Rect = { x: number; y: number; w: number; h: number };

/** Pin a frame edge inside the board; a frame bigger than the board along
 *  an axis is centred on it instead. */
const clampAxis = (pos: number, size: number, total: number) =>
  size >= total ? (total - size) / 2 : Math.max(0, Math.min(total - size, pos));

export function useBoardZoom({
  svgRef,
  landscape,
  wideScreen,
  H,
  loaded,
  boardId,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  landscape: boolean;
  wideScreen: boolean;
  /** Board height in pitch units. */
  H: number;
  /** The svg only exists once the board has loaded. */
  loaded: boolean;
  boardId: string | undefined;
}) {
  // Where the coach has zoomed to, unclamped; null = the whole board.
  const [zoomView, setZoomView] = useState<{
    x: number;
    y: number;
    w: number;
  } | null>(null);
  // the svg element's height ÷ width, kept current by a ResizeObserver
  const [elAspect, setElAspect] = useState<number | null>(null);
  // hand tool: while on, a one-finger / mouse drag moves the view instead
  // of selecting or drawing. Only meaningful when zoomed in.
  const [panMode, setPanMode] = useState(false);
  const panDrag = useRef<{ start: Pt; startView: Rect } | null>(null);
  // live pointers (for the pinch) and the pinch's starting geometry
  const pointers = useRef<Map<number, Pt>>(new Map());
  const pinch = useRef<{
    startDist: number;
    startMid: Pt;
    startView: Rect;
  } | null>(null);

  // The SVG viewBox when fully zoomed out — pitch space in portrait, the
  // rotated space in landscape.
  const baseView: Rect = landscape
    ? { x: 0, y: 0, w: H, h: PITCH_W }
    : { x: 0, y: 0, w: PITCH_W, h: H };

  // Zoomed on a wide screen, the canvas fills the column and the frame takes
  // the element's shape; otherwise the frame is board-shaped.
  const wideFrame = zoomView != null && wideScreen;
  const frameAspect =
    wideFrame && elAspect ? elAspect : baseView.h / baseView.w;
  const view: Rect = (() => {
    if (!zoomView) return baseView;
    const w = Math.min(baseView.w, zoomView.w);
    const h = w * frameAspect;
    return {
      x: clampAxis(zoomView.x, w, baseView.w),
      y: clampAxis(zoomView.y, h, baseView.h),
      w,
      h,
    };
  })();

  // keep the element's aspect current — it changes when the zoom flips the
  // canvas between board-shaped and column-filling
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0) setElAspect(r.height / r.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // the svg is a different element in each orientation
  }, [svgRef, loaded, landscape, boardId]);

  // reset the zoom whenever the orientation flips (their view boxes differ)
  useEffect(() => {
    setZoomView(null);
    pinch.current = null;
  }, [landscape, H]);

  // no zoom, nothing to pan — the hand tool has no job at full size
  useEffect(() => {
    if (!zoomView) setPanMode(false);
  }, [zoomView]);

  /** Distance and midpoint (screen px) of the two active pointers. */
  function pinchGeom() {
    const [a, b] = [...pointers.current.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  /** Record where a pinch starts. The editor abandons any one-finger action
   *  first — that part is its business, not the zoom's. */
  function startPinch() {
    const { dist, mid } = pinchGeom();
    pinch.current = { startDist: dist, startMid: mid, startView: view };
  }

  /** Update the zoom from the live pinch — scale about the midpoint and pan
   *  with it. */
  function applyPinch() {
    if (!pinch.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const { dist, mid } = pinchGeom();
    const sv = pinch.current.startView;
    const scale = pinch.current.startDist / dist;
    const w = Math.max(baseView.w / MAX_ZOOM, Math.min(baseView.w, sv.w * scale));
    const h = w * frameAspect;
    const ax =
      sv.x + ((pinch.current.startMid.x - rect.left) / rect.width) * sv.w;
    const ay =
      sv.y + ((pinch.current.startMid.y - rect.top) / rect.height) * sv.h;
    const x = ax - ((mid.x - rect.left) / rect.width) * w;
    const y = ay - ((mid.y - rect.top) / rect.height) * h;
    setZoomView({ x, y, w });
  }

  /**
   * Zoom so the frame is `w` units across, keeping whatever sits under
   * `anchor` (screen px, default the middle of the canvas) where it is.
   */
  function zoomToWidth(w: number, anchor?: Pt) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const nw = Math.max(baseView.w / MAX_ZOOM, Math.min(baseView.w, w));
    const nh = nw * frameAspect;
    const fx = anchor ? (anchor.x - rect.left) / rect.width : 0.5;
    const fy = anchor ? (anchor.y - rect.top) / rect.height : 0.5;
    const ax = view.x + fx * view.w;
    const ay = view.y + fy * view.h;
    // The whole board in frame is the same thing as not being zoomed at all.
    // A wide frame can show the full width and still have height to pan —
    // that's a real state — but asking to go wider than full width from
    // there means "all the way out".
    const atFullWidth = view.w >= baseView.w - 0.001;
    const wholeBoard =
      (nw >= baseView.w - 0.001 && nh >= baseView.h - 0.001) ||
      (atFullWidth && w > view.w);
    setZoomView(wholeBoard ? null : { x: ax - fx * nw, y: ay - fy * nh, w: nw });
  }

  /** Slide the zoomed frame by (dx, dy) view units; the render clamps it. */
  function panBy(dx: number, dy: number) {
    if (!zoomView) return;
    setZoomView({ x: view.x + dx, y: view.y + dy, w: view.w });
  }

  /** A hand-tool or middle-button drag begins at this screen point. */
  function startPanDrag(clientX: number, clientY: number) {
    panDrag.current = { start: { x: clientX, y: clientY }, startView: view };
  }

  /** Follow a pan drag; returns false if no pan drag is in progress. */
  function applyPanDrag(clientX: number, clientY: number): boolean {
    if (!panDrag.current || !svgRef.current) return false;
    const rect = svgRef.current.getBoundingClientRect();
    const { start, startView } = panDrag.current;
    const k = startView.w / rect.width;
    setZoomView({
      x: startView.x - (clientX - start.x) * k,
      y: startView.y - (clientY - start.y) * k,
      w: startView.w,
    });
    return true;
  }

  // Ctrl/⌘ + wheel zooms — that's the trackpad pinch gesture and the usual
  // desktop convention. A plain wheel pans while zoomed in (two-finger
  // scroll on a trackpad), and is left alone at full size so the page
  // still scrolls with the pointer over the board.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomToWidth(view.w * Math.exp(e.deltaY * 0.002), {
          x: e.clientX,
          y: e.clientY,
        });
        return;
      }
      if (!zoomView) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const k = view.w / rect.width; // px → view units
      // shift + wheel scrolls sideways on a plain mouse
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      panBy(dx * k, dy * k);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // rebinds each render so it closes over the current view
  });

  return {
    baseView,
    view,
    zoomView,
    setZoomView,
    wideFrame,
    panMode,
    setPanMode,
    panDrag,
    pointers,
    pinch,
    startPinch,
    applyPinch,
    zoomToWidth,
    panBy,
    startPanDrag,
    applyPanDrag,
  };
}
