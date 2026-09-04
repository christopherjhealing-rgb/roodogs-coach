"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRepoQuery } from "@/components/DataProvider";
import { formatClock, planSeconds } from "@/lib/plan";
import type { Movement } from "@/lib/types";
import PoseDiagram from "@/components/diagrams/PoseDiagram";

type Step = { sectionName: string; movement: Movement | undefined; durationSec: number; reps?: string; notes?: string };

/** Fullscreen teach mode: steps through the plan with a countdown per movement. */
export default function PresentPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useRepoQuery(async (r) => {
    const [plan, movements] = await Promise.all([r.getPlan(id), r.listMovements()]);
    return { plan, movements };
  }, [id]);

  const steps = useMemo<Step[]>(() => {
    if (!data?.plan) return [];
    const byId = new Map(data.movements.map((m) => [m.id, m]));
    return data.plan.sections.flatMap((s) =>
      s.items.map((i) => ({ sectionName: s.name, movement: byId.get(i.movementId), durationSec: i.durationSec, reps: i.reps, notes: i.notes })),
    );
  }, [data]);

  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const step = steps[idx];

  useEffect(() => {
    setRemaining(step ? step.durationSec : null);
    setRunning(false);
  }, [idx, step]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setRemaining((r) => (r === null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (remaining === 0) setRunning(false);
  }, [remaining]);

  // Keep the screen awake while teaching where supported.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { void lock?.release(); };
  }, []);

  if (!data) return <p className="text-mint/60 p-6">Loading…</p>;
  if (!data.plan) return <p className="p-6">Plan not found. <Link className="underline" href="/plans">Back to plans</Link></p>;
  if (steps.length === 0)
    return (
      <div className="p-6 text-center">
        <p className="mb-4">This plan has no movements yet.</p>
        <Link href={`/plans/${id}`} className="btn-primary">Back to the builder</Link>
      </div>
    );

  const done = remaining === 0;
  const elapsedBefore = steps.slice(0, idx).reduce((s, x) => s + x.durationSec, 0);

  return (
    <div className="fixed inset-0 z-50 bg-forest flex flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <Link href={`/plans/${id}`} className="icon-btn bg-mint/10 text-mint" aria-label="Exit teach mode">✕</Link>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-mint/60">{data.plan.name || "Plan"}</p>
          <p className="text-sm text-mint/80">{idx + 1} of {steps.length} · {formatClock(elapsedBefore)} / {formatClock(planSeconds(data.plan))}</p>
        </div>
        <span className="w-11" />
      </header>

      <div className="h-1.5 mx-4 rounded-full bg-mint/15 overflow-hidden">
        <div className="h-full bg-mint transition-all" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
      </div>

      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm uppercase tracking-widest text-mint/60 mb-2">{step.sectionName}</p>
          <h1 className="display text-4xl md:text-6xl mb-3">{step.movement?.name ?? "Movement removed"}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-mint/80 mb-6">
            {step.reps && <span>{step.reps}</span>}
            {step.movement?.springs && <span>Springs: {step.movement.springs}</span>}
          </div>

          <button
            type="button"
            onClick={() => (done ? (setRemaining(step.durationSec), setRunning(true)) : setRunning((r) => !r))}
            className={`w-full rounded-card py-6 mb-6 text-center transition ${done ? "bg-blush text-forest-deep" : running ? "bg-mint text-forest-deep" : "bg-mint/15 text-mint"}`}
            aria-label={running ? "Pause timer" : "Start timer"}
          >
            <span className="display text-7xl tabular-nums block">{formatClock(remaining ?? step.durationSec)}</span>
            <span className="text-sm mt-1 block opacity-80">{done ? "Time. Tap to restart" : running ? "Tap to pause" : "Tap to start"}</span>
          </button>

          {step.movement && <PoseDiagram movement={step.movement} animate className="pose-hero teach-hero mb-6" />}
          {step.notes && <p className="card mb-4 font-medium">{step.notes}</p>}

          {step.movement && step.movement.cues.length > 0 && (
            <ul className="space-y-3 text-xl leading-snug">
              {step.movement.cues.map((c, i) => (
                <li key={i} className="flex gap-3"><span aria-hidden className="text-mint/50">•</span>{c}</li>
              ))}
            </ul>
          )}
          {step.movement && (
            <p className="mt-6 text-mint/70 leading-relaxed whitespace-pre-line">{step.movement.description}</p>
          )}
        </div>
      </main>

      <footer className="grid grid-cols-2 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <button className="btn-ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>← Previous</button>
        {idx < steps.length - 1 ? (
          <button className="btn-primary" onClick={() => setIdx((i) => i + 1)}>Next →</button>
        ) : (
          <Link href={`/calendar?log=${id}`} className="btn-primary">Finish &amp; log</Link>
        )}
      </footer>
    </div>
  );
}
