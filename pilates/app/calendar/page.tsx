"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LogForm from "@/components/calendar/LogForm";
import { DisciplinePill } from "@/components/library/Pills";
import { useData, useRepoQuery } from "@/components/DataProvider";
import { addMonths, MONTH_NAMES, monthGrid, todayKey, WEEKDAY_SHORT, formatDateLong, formatTime, formatDateShort } from "@/lib/dates";
import { newId } from "@/lib/id";
import type { ClassLog, Discipline } from "@/lib/types";

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarInner />
    </Suspense>
  );
}

const DOT: Record<Discipline, string> = { mat: "bg-mint", reformer: "bg-mint-dim", barre: "bg-blush" };

function CalendarInner() {
  const router = useRouter();
  const params = useSearchParams();
  const logPlanId = params.get("log");
  const { repo, bump } = useData();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(today);
  const [editing, setEditing] = useState<ClassLog | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, error } = useRepoQuery(async (r) => {
    const [logs, plans] = await Promise.all([r.listLogs(), r.listPlans()]);
    return { logs, plans };
  });

  const byDay = useMemo(() => {
    const map = new Map<string, ClassLog[]>();
    for (const l of data?.logs ?? []) {
      const arr = map.get(l.date) ?? [];
      arr.push(l);
      map.set(l.date, arr);
    }
    return map;
  }, [data]);

  function blankLog(date: string, planId: string | null = null): ClassLog {
    const plan = data?.plans.find((p) => p.id === planId);
    return {
      id: newId(),
      ownerId: repo?.userId ?? "",
      date,
      planId: plan ? plan.id : null,
      title: plan?.name ?? "",
      discipline: plan?.discipline ?? "mat",
      notes: "",
      createdAt: new Date().toISOString(),
    };
  }

  // Arrived from "Log as taught": open the form for today with the plan set.
  useEffect(() => {
    if (logPlanId && data && !editing) {
      setEditing(blankLog(today, logPlanId));
      router.replace("/calendar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPlanId, data]);

  async function save(l: ClassLog) {
    if (!repo) return;
    setSaving(true);
    try {
      await repo.saveLog(l);
      bump();
      setSelected(l.date);
      const d = new Date(l.date);
      setCursor({ year: d.getFullYear(), month: d.getMonth() });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(l: ClassLog) {
    if (!repo) return;
    if (!confirm(`Delete "${l.title}" on ${formatDateShort(l.date)}?`)) return;
    await repo.deleteLog(l.id);
    bump();
    setEditing(null);
  }

  const cells = monthGrid(cursor.year, cursor.month);
  const dayLogs = byDay.get(selected) ?? [];
  const monthCount = (data?.logs ?? []).filter((l) => l.date.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`)).length;
  const recent = (data?.logs ?? []).slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Classes taught"
        title="Calendar"
        action={
          <button className="btn-primary btn-sm" onClick={() => setEditing(blankLog(selected))}>
            + Log class
          </button>
        }
      />
      {error && <p className="mb-3 text-sm text-red-200">{error}</p>}

      <section className="card-dark mb-4">
        <div className="flex items-center justify-between mb-3">
          <button className="icon-btn text-mint hover:bg-mint/10" onClick={() => setCursor(addMonths(cursor.year, cursor.month, -1))} aria-label="Previous month">‹</button>
          <div className="text-center">
            <h2 className="display text-2xl">{MONTH_NAMES[cursor.month]} {cursor.year}</h2>
            <p className="text-xs text-mint/60">{monthCount} {monthCount === 1 ? "class" : "classes"}</p>
          </div>
          <button className="icon-btn text-mint hover:bg-mint/10" onClick={() => setCursor(addMonths(cursor.year, cursor.month, 1))} aria-label="Next month">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] uppercase tracking-wide text-mint/50 mb-1">
          {WEEKDAY_SHORT.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={`pad-${i}`} />;
            const logs = byDay.get(key) ?? [];
            const isSel = key === selected;
            const isToday = key === today;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                aria-label={`${formatDateLong(key)}${logs.length ? `, ${logs.length} classes` : ""}`}
                aria-pressed={isSel}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 text-sm transition ${
                  isSel ? "bg-mint text-forest-deep font-semibold" : isToday ? "bg-mint/15 text-mint font-semibold" : "text-mint/85 hover:bg-mint/10"
                }`}
              >
                <span>{Number(key.slice(-2))}</span>
                <span className="flex gap-0.5 h-1.5">
                  {logs.slice(0, 3).map((l) => (
                    <span key={l.id} className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-forest-deep" : DOT[l.discipline]}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        {(cursor.year !== new Date().getFullYear() || cursor.month !== new Date().getMonth()) && (
          <button className="mt-3 text-sm text-mint/70 underline min-h-[44px]" onClick={() => { const d = new Date(); setCursor({ year: d.getFullYear(), month: d.getMonth() }); setSelected(today); }}>
            Back to today
          </button>
        )}
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="display text-xl">{selected === today ? "Today" : formatDateLong(selected)}</h3>
          <button className="btn-ghost btn-sm" onClick={() => setEditing(blankLog(selected))}>+ Log</button>
        </div>
        {!data && <p className="text-mint/60">Loading…</p>}
        {data && dayLogs.length === 0 && <p className="text-mint/60 text-sm">Nothing logged for this day.</p>}
        <div className="space-y-2">
          {dayLogs.map((l) => (
            <LogCard key={l.id} log={l} planName={data?.plans.find((p) => p.id === l.planId)?.name} onEdit={() => setEditing(l)} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h3 className="display text-xl mb-2">Recent classes</h3>
          <div className="space-y-2">
            {recent.map((l) => (
              <LogCard key={l.id} log={l} planName={data?.plans.find((p) => p.id === l.planId)?.name} onEdit={() => setEditing(l)} showDate />
            ))}
          </div>
        </section>
      )}

      {editing && data && (
        <div className="fixed inset-0 z-50 bg-forest-deep/80 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-b-none md:rounded-b-card pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Log a class">
            <h2 className="display text-2xl mb-3">{data.logs.some((x) => x.id === editing.id) ? "Edit class" : "Log a class"}</h2>
            <LogForm
              key={editing.id}
              initial={editing}
              plans={data.plans}
              onSave={save}
              onCancel={() => setEditing(null)}
              onDelete={data.logs.some((x) => x.id === editing.id) ? () => remove(editing) : undefined}
              saving={saving}
            />
          </div>
        </div>
      )}
    </>
  );
}

function LogCard({ log: l, planName, onEdit, showDate }: { log: ClassLog; planName?: string; onEdit: () => void; showDate?: boolean }) {
  return (
    <div className="card flex items-start gap-3">
      <button className="flex-1 min-w-0 text-left" onClick={onEdit}>
        <div className="flex items-center gap-2">
          <h4 className="font-display font-semibold leading-tight truncate">{l.title}</h4>
          <DisciplinePill discipline={l.discipline} />
        </div>
        <p className="mt-1 text-sm text-ink/70">
          {showDate && <span>{formatDateShort(l.date)} · </span>}
          {l.time && <span>{formatTime(l.time)} · </span>}
          {l.location && <span>{l.location} · </span>}
          {l.attendees !== undefined && <span>{l.attendees} attended</span>}
        </p>
        {l.notes && <p className="mt-1 text-sm text-ink/80 line-clamp-2">{l.notes}</p>}
      </button>
      {l.planId && (
        <Link href={`/plans/${l.planId}`} className="btn-ghost-ink btn-sm shrink-0" title={planName}>Plan</Link>
      )}
    </div>
  );
}
