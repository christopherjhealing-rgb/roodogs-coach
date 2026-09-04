"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LessonPlan, Movement, PlanItem, PlanSection, Discipline, Level } from "@/lib/types";
import { DISCIPLINES, LEVELS } from "@/lib/types";
import { useData, useRepoQuery } from "@/components/DataProvider";
import MovementPicker from "@/components/library/MovementPicker";
import { duplicatePlan, formatClock, formatDuration, itemFromMovement, moveItem, newSection, planSeconds, sectionSeconds } from "@/lib/plan";

export default function PlanBuilder({ initial }: { initial: LessonPlan }) {
  const router = useRouter();
  const { repo, bump } = useData();
  const [plan, setPlan] = useState<LessonPlan>(initial);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const { data: movements } = useRepoQuery((r) => r.listMovements());
  const byId = useMemo(() => new Map((movements ?? []).map((m) => [m.id, m])), [movements]);

  // Debounced autosave.
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = useCallback((fn: (p: LessonPlan) => LessonPlan) => {
    setPlan((p) => fn(p));
    dirty.current = true;
    setStatus("dirty");
  }, []);

  useEffect(() => {
    if (!dirty.current || !repo) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      dirty.current = false;
      setStatus("saving");
      try {
        await repo.savePlan(plan);
        setStatus("saved");
        bump();
      } catch {
        setStatus("error");
      }
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [plan, repo, bump]);

  // Flush unsaved edits when the page is hidden or the builder unmounts.
  // Reads the latest plan through a ref so this effect never re-runs (and
  // never saves a stale copy) on each keystroke.
  const latest = useRef(plan);
  latest.current = plan;
  useEffect(() => {
    const flush = () => {
      if (dirty.current && repo) {
        dirty.current = false;
        void repo.savePlan(latest.current);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [repo]);

  const total = planSeconds(plan);
  const target = plan.targetMinutes * 60;
  const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0;
  const over = total > target;

  function addMovement(sectionId: string, m: Movement) {
    update((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, itemFromMovement(m)] } : s)),
    }));
  }

  function patchItem(sectionId: string, itemId: string, patch: Partial<PlanItem>) {
    update((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sectionId ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : s,
      ),
    }));
  }

  function removeItem(sectionId: string, itemId: string) {
    update((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s)),
    }));
  }

  function patchSection(sectionId: string, patch: Partial<PlanSection>) {
    update((p) => ({ ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)) }));
  }

  function removeSection(section: PlanSection) {
    if (section.items.length > 0 && !confirm(`Remove "${section.name}" and its ${section.items.length} movements?`)) return;
    update((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== section.id) }));
  }

  function moveSection(sectionId: string, delta: number) {
    update((p) => {
      const idx = p.sections.findIndex((s) => s.id === sectionId);
      const to = idx + delta;
      if (idx < 0 || to < 0 || to >= p.sections.length) return p;
      const sections = [...p.sections];
      const [s] = sections.splice(idx, 1);
      sections.splice(to, 0, s);
      return { ...p, sections };
    });
  }

  async function duplicate() {
    if (!repo) return;
    const copy = await repo.savePlan(duplicatePlan(plan, repo.userId));
    bump();
    router.push(`/plans/${copy.id}`);
  }

  async function remove() {
    if (!repo) return;
    if (!confirm(`Delete "${plan.name || "this plan"}"? Logged classes keep their notes.`)) return;
    dirty.current = false;
    await repo.deletePlan(plan.id);
    bump();
    router.replace("/plans");
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <section className="card space-y-3">
        <input
          className="w-full bg-transparent display text-2xl placeholder:text-ink/30 outline-none"
          placeholder="Plan name"
          value={plan.name}
          onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
          aria-label="Plan name"
        />
        <div className="grid grid-cols-2 gap-2">
          <select className="field py-2" value={plan.discipline} onChange={(e) => update((p) => ({ ...p, discipline: e.target.value as Discipline }))} aria-label="Discipline">
            {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select className="field py-2" value={plan.level} onChange={(e) => update((p) => ({ ...p, level: e.target.value as Level }))} aria-label="Level">
            {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 text-sm mb-2">
            <span className={`font-semibold whitespace-nowrap ${over ? "text-red-800" : ""}`}>
              {formatDuration(total)} planned
              <span className="block text-xs font-normal text-ink/60 whitespace-nowrap">
                {over ? `${formatDuration(total - target)} over` : `${formatDuration(target - total)} to go`}
              </span>
            </span>
            <label className="inline-flex items-center gap-2 text-ink/70 shrink-0">
              <span>Target</span>
              <input
                className="field py-1 w-16 px-2 text-center"
                inputMode="numeric"
                value={plan.targetMinutes}
                onChange={(e) => update((p) => ({ ...p, targetMinutes: Math.max(0, parseInt(e.target.value || "0", 10) || 0) }))}
                aria-label="Target minutes"
              />
              <span>min</span>
            </label>
          </div>
          <div className="h-2.5 rounded-full bg-forest-deep/15 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${over ? "bg-red-700" : "bg-forest-deep"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      {/* Sections */}
      {plan.sections.map((s, si) => (
        <section key={s.id} className="card-dark">
          <div className="flex items-center gap-2 mb-2">
            <input
              className="flex-1 min-w-0 bg-transparent display text-xl outline-none placeholder:text-mint/30"
              value={s.name}
              onChange={(e) => patchSection(s.id, { name: e.target.value })}
              placeholder="Section"
              aria-label="Section name"
            />
            <span className="text-sm text-mint/60 whitespace-nowrap">{formatDuration(sectionSeconds(s))}</span>
            <button className="icon-btn text-mint/60 hover:bg-mint/10" onClick={() => moveSection(s.id, -1)} disabled={si === 0} aria-label="Move section up">↑</button>
            <button className="icon-btn text-mint/60 hover:bg-mint/10" onClick={() => moveSection(s.id, 1)} disabled={si === plan.sections.length - 1} aria-label="Move section down">↓</button>
            <button className="icon-btn text-mint/60 hover:bg-mint/10" onClick={() => removeSection(s)} aria-label="Remove section">✕</button>
          </div>

          <ul className="space-y-2">
            {s.items.map((it, ii) => {
              const m = byId.get(it.movementId);
              return (
                <li key={it.id} className="rounded-2xl bg-forest-deep/60 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {m ? (
                        <Link href={`/library/${m.id}`} className="font-semibold leading-tight hover:underline">{m.name}</Link>
                      ) : (
                        <span className="font-semibold text-mint/50">Movement removed</span>
                      )}
                      {m?.springs && <p className="text-xs text-mint/60">Springs: {m.springs}</p>}
                    </div>
                    <div className="flex shrink-0">
                      <button className="icon-btn text-mint/60 hover:bg-mint/10" onClick={() => setPlan((p) => { dirty.current = true; setStatus("dirty"); return moveItem(p, s.id, it.id, -1); })} disabled={ii === 0} aria-label="Move up">↑</button>
                      <button className="icon-btn text-mint/60 hover:bg-mint/10" onClick={() => setPlan((p) => { dirty.current = true; setStatus("dirty"); return moveItem(p, s.id, it.id, 1); })} disabled={ii === s.items.length - 1} aria-label="Move down">↓</button>
                      <button className="icon-btn text-mint/60 hover:bg-mint/10" onClick={() => removeItem(s.id, it.id)} aria-label="Remove movement">✕</button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-full bg-forest border border-forest-line">
                      <button className="icon-btn w-10 h-10 text-mint" onClick={() => patchItem(s.id, it.id, { durationSec: Math.max(15, it.durationSec - 30) })} aria-label="30 seconds less">−</button>
                      <span className="w-14 text-center font-semibold tabular-nums">{formatClock(it.durationSec)}</span>
                      <button className="icon-btn w-10 h-10 text-mint" onClick={() => patchItem(s.id, it.id, { durationSec: it.durationSec + 30 })} aria-label="30 seconds more">+</button>
                    </div>
                    <input
                      className="flex-1 min-w-[7rem] rounded-full bg-forest border border-forest-line px-3 py-2 text-sm text-mint placeholder:text-mint/40 outline-none focus:border-mint/60"
                      placeholder="Reps"
                      value={it.reps ?? ""}
                      onChange={(e) => patchItem(s.id, it.id, { reps: e.target.value })}
                      aria-label="Reps"
                    />
                  </div>
                  <input
                    className="mt-2 w-full rounded-full bg-transparent border border-forest-line px-3 py-2 text-sm text-mint placeholder:text-mint/40 outline-none focus:border-mint/60"
                    placeholder="Notes for this movement (optional)"
                    value={it.notes ?? ""}
                    onChange={(e) => patchItem(s.id, it.id, { notes: e.target.value })}
                    aria-label="Notes"
                  />
                </li>
              );
            })}
          </ul>

          <button className="btn-ghost btn-sm w-full mt-3" onClick={() => setPickerFor(s.id)}>
            + Add movement
          </button>
        </section>
      ))}

      <button className="btn-ghost w-full" onClick={() => update((p) => ({ ...p, sections: [...p.sections, newSection("New section")] }))}>
        + Add section
      </button>

      <section className="card">
        <label className="label" htmlFor="notes">Plan notes</label>
        <textarea id="notes" rows={3} className="field" placeholder="Music, props to set out, who to keep an eye on…" value={plan.notes} onChange={(e) => update((p) => ({ ...p, notes: e.target.value }))} />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/plans/${plan.id}/present`} className="btn-primary col-span-2">▶ Teach this plan</Link>
        <Link href={`/calendar?log=${plan.id}`} className="btn-ghost">Log as taught</Link>
        <button className="btn-ghost" onClick={duplicate}>Duplicate</button>
        <button className="btn-ghost col-span-2 text-mint/70" onClick={remove}>Delete plan</button>
      </div>

      <p className="text-center text-xs text-mint/50 pb-2" aria-live="polite">
        {status === "saved" && "Saved"}
        {status === "dirty" && "Editing…"}
        {status === "saving" && "Saving…"}
        {status === "error" && "Could not save. Check your connection."}
      </p>

      <MovementPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onPick={(m) => pickerFor && addMovement(pickerFor, m)}
        discipline={plan.discipline}
        title={`Add to ${plan.sections.find((s) => s.id === pickerFor)?.name ?? "section"}`}
      />
    </div>
  );
}
