"use client";

import { useEffect, useState } from "react";
import type { ClassLog, Discipline, LessonPlan } from "@/lib/types";
import { DISCIPLINES } from "@/lib/types";
import { formatDateLong } from "@/lib/dates";

export default function LogForm({
  initial,
  plans,
  onSave,
  onCancel,
  onDelete,
  saving,
}: {
  initial: ClassLog;
  plans: LessonPlan[];
  onSave: (l: ClassLog) => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving?: boolean;
}) {
  const [l, setL] = useState<ClassLog>(initial);
  const [attendees, setAttendees] = useState(initial.attendees?.toString() ?? "");

  // Picking a plan fills in a sensible title and discipline.
  function choosePlan(planId: string) {
    const p = plans.find((x) => x.id === planId);
    setL((cur) => ({
      ...cur,
      planId: p ? p.id : null,
      title: p && (!cur.title || cur.title === planTitle(plans, cur.planId)) ? p.name : cur.title,
      discipline: p ? p.discipline : cur.discipline,
    }));
  }

  useEffect(() => {
    if (initial.planId && !initial.title) choosePlan(initial.planId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(attendees, 10);
    onSave({
      ...l,
      title: l.title.trim() || planTitle(plans, l.planId) || "Class",
      attendees: Number.isFinite(n) && n >= 0 ? n : undefined,
      time: l.time || undefined,
      location: l.location?.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="date">Date</label>
        <input id="date" type="date" required className="field" value={l.date} onChange={(e) => setL({ ...l, date: e.target.value })} />
        <p className="mt-1 text-xs text-ink/60">{l.date && formatDateLong(l.date)}</p>
      </div>
      <div>
        <label className="label" htmlFor="plan">Lesson plan</label>
        <select id="plan" className="field" value={l.planId ?? ""} onChange={(e) => choosePlan(e.target.value)}>
          <option value="">No plan (free-form class)</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name || "Untitled plan"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="title">Class title*</label>
        <input id="title" required className="field" value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} placeholder="Morning reformer" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="time">Time</label>
          <input id="time" type="time" className="field" value={l.time ?? ""} onChange={(e) => setL({ ...l, time: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="discipline">Discipline</label>
          <select id="discipline" className="field" value={l.discipline} onChange={(e) => setL({ ...l, discipline: e.target.value as Discipline })}>
            {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input id="location" className="field" value={l.location ?? ""} onChange={(e) => setL({ ...l, location: e.target.value })} placeholder="Studio 1" />
        </div>
        <div>
          <label className="label" htmlFor="attendees">Attendees</label>
          <input id="attendees" inputMode="numeric" className="field" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="8" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" rows={3} className="field" value={l.notes} onChange={(e) => setL({ ...l, notes: e.target.value })} placeholder="What worked, what to change next time…" />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn-ghost-ink flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-dark flex-1">{saving ? "Saving…" : "Save"}</button>
      </div>
      {onDelete && (
        <button type="button" onClick={onDelete} className="w-full text-sm text-ink/60 underline min-h-[44px]">Delete this entry</button>
      )}
    </form>
  );
}

function planTitle(plans: LessonPlan[], planId: string | null): string {
  return plans.find((p) => p.id === planId)?.name ?? "";
}
