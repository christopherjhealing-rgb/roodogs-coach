"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PlanBuilder from "@/components/plans/PlanBuilder";
import { useData } from "@/components/DataProvider";
import { useEffect, useState } from "react";
import type { LessonPlan } from "@/lib/types";

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const { repo } = useData();
  // Loaded once on entry; the builder owns the state after that so autosave
  // never fights a re-read.
  const [plan, setPlan] = useState<LessonPlan | null | undefined>(undefined);

  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    repo.getPlan(id).then((p) => {
      if (!cancelled) setPlan(p);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, id]);

  if (plan === undefined) return <p className="text-mint/60 py-10">Loading…</p>;
  if (plan === null)
    return (
      <>
        <PageHeader title="Not found" back={{ href: "/plans", label: "Plans" }} />
        <p>This plan does not exist (it may have been deleted).</p>
      </>
    );

  return (
    <>
      <PageHeader eyebrow="Lesson plan" title="Build" back={{ href: "/plans", label: "Plans" }} />
      <PlanBuilder key={plan.id} initial={plan} />
    </>
  );
}
