"use client";

import { useEffect, useMemo, useState } from "react";
import type { Movement, Discipline } from "@/lib/types";
import { EMPTY_FILTER, filterMovements, type MovementFilter } from "@/lib/search";
import { useRepoQuery } from "@/components/DataProvider";
import MovementFilters from "./MovementFilters";
import MovementCard from "./MovementCard";

/** Full-screen sheet for choosing a movement to add to a plan section. */
export default function MovementPicker({
  open,
  onClose,
  onPick,
  discipline,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (m: Movement) => void;
  discipline?: Discipline;
  title: string;
}) {
  const [filter, setFilter] = useState<MovementFilter>({ ...EMPTY_FILTER, discipline: discipline ?? "all" });
  const { data: all } = useRepoQuery((repo) => repo.listMovements());

  useEffect(() => {
    if (open) setFilter((f) => ({ ...f, query: "", discipline: discipline ?? "all" }));
  }, [open, discipline]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const list = useMemo(() => (all ? filterMovements(all, filter) : []), [all, filter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-forest flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <div className="px-4 pt-4 pb-3 border-b border-forest-line">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="display text-2xl">{title}</h2>
            <button type="button" onClick={onClose} className="icon-btn bg-mint/10 text-mint" aria-label="Close">
              ✕
            </button>
          </div>
          <MovementFilters value={filter} onChange={setFilter} compact />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl space-y-3">
          {!all && <p className="text-mint/60">Loading…</p>}
          {all && list.length === 0 && <p className="text-mint/60">No movements match.</p>}
          {list.map((m) => (
            <MovementCard key={m.id} movement={m} onPick={(mv) => { onPick(mv); onClose(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}
