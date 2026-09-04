"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Empty from "@/components/Empty";
import { useRepoQuery } from "@/components/DataProvider";
import { DisciplinePill, LevelPill } from "@/components/library/Pills";
import { formatDuration, planMovementCount, planSeconds } from "@/lib/plan";

export default function PlansPage() {
  const { data: plans, error } = useRepoQuery((r) => r.listPlans());

  return (
    <>
      <PageHeader
        eyebrow="Lesson plans"
        title="Plans"
        action={
          <Link href="/plans/new" className="btn-primary btn-sm">
            + New plan
          </Link>
        }
      />
      {error && <p className="mb-3 text-sm text-red-200">{error}</p>}
      {!plans && <p className="text-mint/60">Loading…</p>}
      {plans && plans.length === 0 && (
        <Empty
          title="No plans yet"
          body="Build your first class from the movement library. Warm-up, main blocks, cool-down, all timed against your class length."
          action={<Link href="/plans/new" className="btn-primary">Start a plan</Link>}
        />
      )}
      <div className="space-y-3">
        {plans?.map((p) => {
          const secs = planSeconds(p);
          return (
            <Link key={p.id} href={`/plans/${p.id}`} className="card block hover:bg-mint-bright transition">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display font-semibold text-lg leading-tight">{p.name || "Untitled plan"}</h3>
                <DisciplinePill discipline={p.discipline} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/70">
                <LevelPill level={p.level} onCard />
                <span>{formatDuration(secs)} of {p.targetMinutes} min</span>
                <span>{planMovementCount(p)} movements</span>
              </div>
              <p className="mt-2 text-xs text-ink/50">
                Updated {new Date(p.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
