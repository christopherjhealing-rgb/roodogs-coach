"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import MovementForm from "@/components/library/MovementForm";
import { useData, useRepoQuery } from "@/components/DataProvider";
import type { Movement } from "@/lib/types";

export default function EditMovementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { repo, bump } = useData();
  const { data: m } = useRepoQuery((r) => r.getMovement(id), [id]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (m === undefined) return <p className="text-mint/60 py-10">Loading…</p>;
  if (m === null || m.ownerId === null)
    return (
      <>
        <PageHeader title="Can't edit" back={{ href: "/library", label: "Library" }} />
        <p className="text-mint/80">Library movements are shared. Open the movement and choose “Make my own editable copy”.</p>
      </>
    );

  async function save(next: Movement) {
    if (!repo) return;
    setSaving(true);
    try {
      await repo.saveMovement(next);
      bump();
      router.replace(`/library/${next.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Edit movement" back={{ href: `/library/${id}`, label: m.name }} />
      {error && <p className="mb-3 text-sm text-red-200">{error}</p>}
      <MovementForm initial={m} onSave={save} onCancel={() => router.back()} saving={saving} />
    </>
  );
}
