"use client";

import { useEffect, useRef, useState } from "react";
import { storage } from "@/lib/storage";
import type { Player } from "@/lib/types";

interface Slot {
  id: string;
  x: number;
  y: number;
  label: string;
  unit: "forwards" | "backs";
}

const VIEW_W = 240;
const VIEW_H = 158;

// U10 shape: six forwards (front row + two locks + No. 8, no flankers)
// packed as a scrum, and six backs in a back line.
const SLOTS: Slot[] = [
  { id: "F0", x: 44, y: 26, label: "Prop", unit: "forwards" },
  { id: "F1", x: 70, y: 26, label: "Hooker", unit: "forwards" },
  { id: "F2", x: 96, y: 26, label: "Prop", unit: "forwards" },
  { id: "F3", x: 57, y: 54, label: "Lock", unit: "forwards" },
  { id: "F4", x: 83, y: 54, label: "Lock", unit: "forwards" },
  { id: "F5", x: 70, y: 82, label: "No. 8", unit: "forwards" },
  { id: "B0", x: 118, y: 92, label: "Scrum-half", unit: "backs" },
  { id: "B1", x: 148, y: 104, label: "Fly-half", unit: "backs" },
  { id: "B2", x: 180, y: 116, label: "Centre", unit: "backs" },
  { id: "B3", x: 22, y: 122, label: "Winger", unit: "backs" },
  { id: "B4", x: 218, y: 138, label: "Winger", unit: "backs" },
  { id: "B5", x: 130, y: 138, label: "Full-back", unit: "backs" },
];

type Pt = { x: number; y: number };

/**
 * Team shape: forwards packed as a scrum, backs as a back line. Slots seed
 * from the roster (by unit, in roster order) and every player can then be
 * dragged between positions; the arrangement is remembered.
 */
export default function FormationView({ roster }: { roster: Player[] }) {
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<{ slotId: string; pos: Pt } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load the stored arrangement, drop players no longer on the roster, and
  // seed empty slots from each unit in roster order.
  useEffect(() => {
    const stored = storage.getFormation();
    const rosterIds = new Set(roster.map((p) => p.id));
    const map: Record<string, string> = {};
    const placed = new Set<string>();
    for (const slot of SLOTS) {
      const pid = stored[slot.id];
      if (pid && rosterIds.has(pid) && !placed.has(pid)) {
        map[slot.id] = pid;
        placed.add(pid);
      }
    }
    for (const unit of ["forwards", "backs"] as const) {
      const pool = roster.filter((p) => p.unit === unit && !placed.has(p.id));
      for (const slot of SLOTS.filter((s) => s.unit === unit)) {
        if (map[slot.id]) continue;
        const next = pool.shift();
        if (!next) break;
        map[slot.id] = next.id;
        placed.add(next.id);
      }
    }
    setAssign(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster.map((p) => p.id).join(",")]);

  function persist(map: Record<string, string>) {
    setAssign(map);
    storage.setFormation(map);
  }

  function toSvg(e: React.PointerEvent): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  function onSlotPointerDown(e: React.PointerEvent, slot: Slot) {
    if (!assign[slot.id]) return;
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ slotId: slot.id, pos: toSvg(e) });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, pos: toSvg(e) });
  }

  function onPointerUp() {
    if (!drag) return;
    const { slotId, pos } = drag;
    setDrag(null);
    let best: Slot | null = null;
    let bestD = Infinity;
    for (const s of SLOTS) {
      const d = Math.hypot(s.x - pos.x, s.y - pos.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best || best.id === slotId || bestD > 20) return;
    const map = { ...assign };
    const moving = map[slotId];
    const other = map[best.id];
    if (other) map[slotId] = other;
    else delete map[slotId];
    map[best.id] = moving;
    persist(map);
  }

  const byId = new Map(roster.map((p) => [p.id, p]));
  const placedIds = new Set(Object.values(assign));
  const spare = roster.filter((p) => !placedIds.has(p.id));
  const firstName = (p: Player) => p.name.split(" ")[0];

  const dragPlayerId = drag ? assign[drag.slotId] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full touch-none select-none rounded-xl"
        role="img"
        aria-label="Team formation"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {/* light tactical-board look, matched to the whiteboard and drills */}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#f2f5ef" />
        <rect
          x={2}
          y={2}
          width={VIEW_W - 4}
          height={VIEW_H - 4}
          fill="none"
          stroke="#2F6B3A"
          strokeWidth={0.7}
          strokeDasharray="3.5 2.5"
          opacity={0.5}
        />
        <text x={8} y={13} fontSize={6} fontWeight={700} fill="#1E5B3C">
          Forwards — scrum
        </text>
        <text x={8} y={152} fontSize={6} fontWeight={700} fill="#1E5B3C">
          Backs — back line
        </text>
        {SLOTS.map((slot) => {
          const player = assign[slot.id]
            ? byId.get(assign[slot.id])
            : undefined;
          const dragging = drag?.slotId === slot.id;
          return (
            <g
              key={slot.id}
              transform={`translate(${slot.x} ${slot.y})`}
              opacity={dragging ? 0.35 : 1}
              onPointerDown={(e) => onSlotPointerDown(e, slot)}
              style={player ? { cursor: "grab" } : undefined}
            >
              <circle r={11} fill="transparent" />
              {player ? (
                <>
                  <circle r={7.5} fill="#1E5B3C" stroke="#12332A" strokeWidth={0.9} />
                  <text
                    textAnchor="middle"
                    dy={2.3}
                    fontSize={6.5}
                    fontWeight={700}
                    fill="#ffffff"
                    pointerEvents="none"
                  >
                    {player.jersey ?? "•"}
                  </text>
                  <text
                    textAnchor="middle"
                    dy={15.5}
                    fontSize={5.6}
                    fontWeight={700}
                    fill="#12332A"
                    stroke="#f2f5ef"
                    strokeWidth={0.9}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {firstName(player)}
                  </text>
                  <text
                    textAnchor="middle"
                    dy={21.5}
                    fontSize={4}
                    fill="#5B6878"
                    pointerEvents="none"
                  >
                    {slot.label}
                  </text>
                </>
              ) : (
                <>
                  <circle
                    r={7.5}
                    fill="none"
                    stroke="#1E5B3C"
                    strokeWidth={0.9}
                    strokeDasharray="2.2 1.6"
                    opacity={0.45}
                  />
                  <text
                    textAnchor="middle"
                    dy={15.5}
                    fontSize={4.4}
                    fill="#5B6878"
                    pointerEvents="none"
                  >
                    {slot.label}
                  </text>
                </>
              )}
            </g>
          );
        })}
        {drag && dragPlayerId && (
          <g
            transform={`translate(${drag.pos.x} ${drag.pos.y})`}
            pointerEvents="none"
            opacity={0.9}
          >
            <circle r={8} fill="#facc15" stroke="#12332A" strokeWidth={1.1} />
            <text
              textAnchor="middle"
              dy={2.3}
              fontSize={6.5}
              fontWeight={700}
              fill="#12332A"
            >
              {byId.get(dragPlayerId)?.jersey ?? "•"}
            </text>
          </g>
        )}
      </svg>
      <p className="text-xs text-stone-400">
        Drag a player between positions to swap them — the shape is
        remembered. Positions seed from each player&apos;s Forwards/Backs
        setting in roster order.
      </p>
      {spare.length > 0 && (
        <p className="text-xs text-stone-500">
          Not on the shape: {spare.map((p) => firstName(p)).join(", ")}
        </p>
      )}
    </div>
  );
}
