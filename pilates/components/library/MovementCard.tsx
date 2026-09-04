import Link from "next/link";
import type { Movement } from "@/lib/types";
import { FOCUS_AREAS, labelFor } from "@/lib/types";
import { formatDuration } from "@/lib/plan";
import { DisciplinePill, LevelPill } from "./Pills";

export default function MovementCard({
  movement: m,
  href,
  onPick,
}: {
  movement: Movement;
  href?: string;
  onPick?: (m: Movement) => void;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-lg leading-tight truncate">{m.name}</h3>
          <p className="mt-1 text-sm text-ink/70 line-clamp-2">{m.description}</p>
        </div>
        <DisciplinePill discipline={m.discipline} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/70">
        <LevelPill level={m.level} onCard />
        <span>{m.focus.map((f) => labelFor(FOCUS_AREAS, f)).join(" · ")}</span>
        {m.springs && <span>Springs: {m.springs}</span>}
        {m.defaultDurationSec && <span>{formatDuration(m.defaultDurationSec)}</span>}
        {m.ownerId !== null && <span className="pill bg-forest-deep/10 text-ink">Mine</span>}
      </div>
    </>
  );

  if (onPick) {
    return (
      <button type="button" onClick={() => onPick(m)} className="card w-full text-left hover:bg-mint-bright transition">
        {body}
      </button>
    );
  }
  return (
    <Link href={href ?? `/library/${m.id}`} className="card block hover:bg-mint-bright transition">
      {body}
    </Link>
  );
}
