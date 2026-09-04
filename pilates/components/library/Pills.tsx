import type { Discipline, Level } from "@/lib/types";
import { DISCIPLINES, LEVELS, labelFor } from "@/lib/types";

const DISC_STYLE: Record<Discipline, string> = {
  mat: "bg-mint text-forest-deep",
  reformer: "bg-forest-deep text-mint",
  barre: "bg-blush text-forest-deep",
};

export function DisciplinePill({ discipline }: { discipline: Discipline }) {
  return <span className={`pill ${DISC_STYLE[discipline]}`}>{labelFor(DISCIPLINES, discipline)}</span>;
}

export function LevelPill({ level, onCard = false }: { level: Level; onCard?: boolean }) {
  const dots = level === "beginner" ? 1 : level === "intermediate" ? 2 : 3;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${onCard ? "text-ink/70" : "text-mint/70"}`}
      title={labelFor(LEVELS, level)}
    >
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= dots ? "bg-current" : "bg-current opacity-25"}`} />
        ))}
      </span>
      {labelFor(LEVELS, level)}
    </span>
  );
}
