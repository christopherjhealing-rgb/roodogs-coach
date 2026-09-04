"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useData, useRepoQuery } from "@/components/DataProvider";
import { DisciplinePill, LevelPill } from "@/components/library/Pills";
import { EQUIPMENT, FOCUS_AREAS, labelFor } from "@/lib/types";
import { formatDuration, itemFromMovement } from "@/lib/plan";
import { newId } from "@/lib/id";

export default function MovementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { repo, bump } = useData();
  const { data: m } = useRepoQuery((r) => r.getMovement(id), [id]);
  const { data: plans } = useRepoQuery((r) => r.listPlans());
  const [addingTo, setAddingTo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (m === undefined) return <p className="text-mint/60 py-10">Loading…</p>;
  if (m === null)
    return (
      <>
        <PageHeader title="Not found" back={{ href: "/library", label: "Library" }} />
        <p>This movement does not exist (it may have been deleted).</p>
      </>
    );

  const mine = m.ownerId !== null;

  async function duplicate() {
    if (!repo || !m) return;
    setBusy(true);
    const copy = await repo.saveMovement({ ...m, id: newId(), ownerId: repo.userId, name: `${m.name} (my version)` });
    bump();
    router.push(`/library/${copy.id}/edit`);
  }

  async function remove() {
    if (!repo || !m) return;
    if (!confirm(`Delete "${m.name}" from your library?`)) return;
    await repo.deleteMovement(m.id);
    bump();
    router.replace("/library");
  }

  async function addToPlan(planId: string | "new") {
    if (!repo || !m) return;
    setBusy(true);
    try {
      if (planId === "new") {
        const { newPlan } = await import("@/lib/plan");
        const p = newPlan(repo.userId, { discipline: m.discipline, name: `${m.name} class` });
        p.sections[1].items.push(itemFromMovement(m));
        const saved = await repo.savePlan(p);
        bump();
        router.push(`/plans/${saved.id}`);
        return;
      }
      const p = await repo.getPlan(planId);
      if (!p) return;
      const target = p.sections.find((s) => s.name.toLowerCase() === "main") ?? p.sections[0];
      if (!target) return;
      target.items.push(itemFromMovement(m));
      await repo.savePlan(p);
      bump();
      setAddingTo(false);
      setToast(`Added to ${p.name || "plan"}`);
      setTimeout(() => setToast(null), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={m.name}
        eyebrow={mine ? "Your movement" : "Library"}
        back={{ href: "/library", label: "Library" }}
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <DisciplinePill discipline={m.discipline} />
        <LevelPill level={m.level} />
        {m.defaultDurationSec && <span className="text-sm text-mint/70">· {formatDuration(m.defaultDurationSec)}</span>}
        {m.defaultReps && <span className="text-sm text-mint/70">· {m.defaultReps}</span>}
      </div>

      <div className="space-y-4">
        <section className="card">
          <p className="whitespace-pre-line leading-relaxed">{m.description}</p>
          {m.springs && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">Springs:</span> {m.springs}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {m.focus.map((f) => (
              <span key={f} className="pill bg-forest-deep text-mint">{labelFor(FOCUS_AREAS, f)}</span>
            ))}
            {m.equipment.filter((e) => e !== "none").map((e) => (
              <span key={e} className="pill bg-forest-deep/10 text-ink">{labelFor(EQUIPMENT, e)}</span>
            ))}
          </div>
        </section>

        {m.cues.length > 0 && (
          <Section title="Cues">
            <ul className="space-y-2">
              {m.cues.map((c, i) => (
                <li key={i} className="flex gap-2"><span aria-hidden className="text-mint">•</span><span>{c}</span></li>
              ))}
            </ul>
          </Section>
        )}
        {m.modifications.length > 0 && (
          <Section title="Modifications">
            <ul className="space-y-2">
              {m.modifications.map((c, i) => (
                <li key={i} className="flex gap-2"><span aria-hidden className="text-mint">↕</span><span>{c}</span></li>
              ))}
            </ul>
          </Section>
        )}
        {m.contraindications.length > 0 && (
          <Section title="Take care">
            <ul className="space-y-2">
              {m.contraindications.map((c, i) => (
                <li key={i} className="flex gap-2"><span aria-hidden className="text-blush">!</span><span>{c}</span></li>
              ))}
            </ul>
          </Section>
        )}
        {m.tags.length > 0 && (
          <p className="text-xs text-mint/50">{m.tags.map((t) => `#${t}`).join("  ")}</p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button className="btn-primary col-span-2" onClick={() => setAddingTo(true)} disabled={busy}>
            Add to a plan
          </button>
          {mine ? (
            <>
              <Link href={`/library/${m.id}/edit`} className="btn-ghost">Edit</Link>
              <button className="btn-ghost" onClick={remove} disabled={busy}>Delete</button>
            </>
          ) : (
            <button className="btn-ghost col-span-2" onClick={duplicate} disabled={busy}>
              Make my own editable copy
            </button>
          )}
        </div>
      </div>

      {addingTo && (
        <div className="fixed inset-0 z-50 bg-forest-deep/80 flex items-end md:items-center justify-center p-4" onClick={() => setAddingTo(false)}>
          <div className="card w-full max-w-md max-h-[80dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choose a plan">
            <h2 className="display text-2xl mb-3">Add to which plan?</h2>
            <div className="space-y-2">
              <button className="btn-dark w-full" onClick={() => addToPlan("new")} disabled={busy}>+ New plan</button>
              {(plans ?? []).map((p) => (
                <button key={p.id} className="btn-ghost-ink w-full justify-between" onClick={() => addToPlan(p.id)} disabled={busy}>
                  <span className="truncate">{p.name || "Untitled plan"}</span>
                  <span className="text-xs text-ink/60">{labelFor([{ id: p.discipline, label: p.discipline }], p.discipline)}</span>
                </button>
              ))}
              {plans && plans.length === 0 && <p className="text-sm text-ink/60">No plans yet. Start a new one.</p>}
            </div>
            <button className="btn-ghost-ink w-full mt-3" onClick={() => setAddingTo(false)}>Cancel</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="bg-mint text-forest-deep rounded-full px-5 py-3 font-semibold shadow-lg">{toast}</div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-dark">
      <h2 className="display text-xl mb-3">{title}</h2>
      {children}
    </section>
  );
}
