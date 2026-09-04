"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import MovementForm from "@/components/library/MovementForm";
import { useData } from "@/components/DataProvider";
import { newId } from "@/lib/id";
import type { Movement } from "@/lib/types";

export default function NewMovementPage() {
  const router = useRouter();
  const { repo, bump } = useData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blank: Movement = {
    id: newId(),
    ownerId: repo?.userId ?? "",
    name: "",
    discipline: "mat",
    level: "beginner",
    focus: [],
    equipment: ["mat"],
    description: "",
    cues: [],
    modifications: [],
    contraindications: [],
    tags: [],
    defaultDurationSec: 120,
  };

  async function save(m: Movement) {
    if (!repo) return;
    setSaving(true);
    try {
      const saved = await repo.saveMovement(m);
      bump();
      router.replace(`/library/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="New movement" back={{ href: "/library", label: "Library" }} />
      {error && <p className="mb-3 text-sm text-red-200">{error}</p>}
      <MovementForm initial={blank} onSave={save} onCancel={() => router.back()} saving={saving} />
    </>
  );
}
