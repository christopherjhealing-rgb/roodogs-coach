"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { newPlan } from "@/lib/plan";

/** Creates a blank plan and opens the builder. */
export default function NewPlanPage() {
  const router = useRouter();
  const { repo, bump } = useData();
  const started = useRef(false);

  useEffect(() => {
    if (!repo || started.current) return;
    started.current = true;
    repo.savePlan(newPlan(repo.userId)).then((p) => {
      bump();
      router.replace(`/plans/${p.id}`);
    });
  }, [repo, bump, router]);

  return <p className="text-mint/60 py-10">Creating plan…</p>;
}
