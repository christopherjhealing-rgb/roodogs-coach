"use client";

import type { Player } from "@/lib/types";

interface Slot {
  x: number;
  y: number;
  label: string;
}

// U10 shape: six forwards (front row + two locks + No. 8, no flankers)
// packed as a scrum, and a six-strong back line.
const FORWARD_SLOTS: Slot[] = [
  { x: 30, y: 26, label: "Prop" },
  { x: 42, y: 26, label: "Hooker" },
  { x: 54, y: 26, label: "Prop" },
  { x: 36, y: 40, label: "Lock" },
  { x: 48, y: 40, label: "Lock" },
  { x: 42, y: 54, label: "No. 8" },
];

const BACK_SLOTS: Slot[] = [
  { x: 62, y: 62, label: "Scrum-half" },
  { x: 88, y: 70, label: "Fly-half" },
  { x: 114, y: 80, label: "Centre" },
  { x: 16, y: 84, label: "Winger" },
  { x: 180, y: 92, label: "Winger" },
  { x: 105, y: 106, label: "Full-back" },
];

function SlotCircle({ slot, player }: { slot: Slot; player?: Player }) {
  return (
    <g transform={`translate(${slot.x} ${slot.y})`}>
      {player ? (
        <>
          <circle r={6.5} fill="#ffffff" stroke="#12332A" strokeWidth={1} />
          <text
            textAnchor="middle"
            dy={2}
            fontSize={5.5}
            fontWeight={700}
            fill="#12332A"
          >
            {player.jersey ?? "•"}
          </text>
          <text
            textAnchor="middle"
            dy={13.5}
            fontSize={4.6}
            fontWeight={600}
            fill="#ffffff"
          >
            {player.name}
          </text>
          <text
            textAnchor="middle"
            dy={18.5}
            fontSize={3.4}
            fill="#bbf7d0"
          >
            {slot.label}
          </text>
        </>
      ) : (
        <>
          <circle
            r={6.5}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.8}
            strokeDasharray="2 1.5"
            opacity={0.55}
          />
          <text
            textAnchor="middle"
            dy={13.5}
            fontSize={3.6}
            fill="#ffffff"
            opacity={0.6}
          >
            {slot.label}
          </text>
        </>
      )}
    </g>
  );
}

/**
 * Team shape: forwards packed as a scrum, backs as a back line. Slots fill
 * in roster order within each unit, so reordering the roster changes who
 * stands where.
 */
export default function FormationView({ roster }: { roster: Player[] }) {
  const forwards = roster.filter((p) => p.unit === "forwards");
  const backs = roster.filter((p) => p.unit === "backs");
  const unassigned = roster.filter((p) => !p.unit);
  const spareForwards = forwards.slice(FORWARD_SLOTS.length);
  const spareBacks = backs.slice(BACK_SLOTS.length);

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox="0 0 200 122"
        className="w-full rounded-xl"
        role="img"
        aria-label="Team formation"
      >
        <rect x={0} y={0} width={200} height={122} fill="#2f7a44" />
        <rect
          x={2}
          y={2}
          width={196}
          height={118}
          fill="none"
          stroke="#fff"
          strokeWidth={0.7}
          opacity={0.9}
        />
        <text x={8} y={12} fontSize={5} fontWeight={700} fill="#ffffff" opacity={0.85}>
          Forwards — scrum
        </text>
        <text x={8} y={116} fontSize={5} fontWeight={700} fill="#ffffff" opacity={0.85}>
          Backs — back line
        </text>
        {FORWARD_SLOTS.map((s, i) => (
          <SlotCircle key={`f${i}`} slot={s} player={forwards[i]} />
        ))}
        {BACK_SLOTS.map((s, i) => (
          <SlotCircle key={`b${i}`} slot={s} player={backs[i]} />
        ))}
      </svg>
      <p className="text-xs text-stone-400">
        Slots fill in roster order within each unit — use the ↑↓ arrows on the
        list to change who stands where. Set each player&apos;s Forwards/Backs
        on their card.
      </p>
      {(spareForwards.length > 0 ||
        spareBacks.length > 0 ||
        unassigned.length > 0) && (
        <p className="text-xs text-stone-500">
          {spareForwards.length > 0 && (
            <>
              Spare forwards: {spareForwards.map((p) => p.name).join(", ")}.{" "}
            </>
          )}
          {spareBacks.length > 0 && (
            <>Spare backs: {spareBacks.map((p) => p.name).join(", ")}. </>
          )}
          {unassigned.length > 0 && (
            <>No unit set: {unassigned.map((p) => p.name).join(", ")}.</>
          )}
        </p>
      )}
    </div>
  );
}
