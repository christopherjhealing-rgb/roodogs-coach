"use client";

import PageHeader from "@/components/PageHeader";
import { useData, useRepoQuery } from "@/components/DataProvider";

export default function AccountPage() {
  const { user, cloud, signOut } = useData();
  const { data: counts } = useRepoQuery(async (repo) => {
    const [movements, plans, logs] = await Promise.all([repo.listMovements(), repo.listPlans(), repo.listLogs()]);
    return {
      mine: movements.filter((m) => m.ownerId !== null).length,
      seed: movements.filter((m) => m.ownerId === null).length,
      plans: plans.length,
      logs: logs.length,
    };
  });

  const name =
    (user?.user_metadata?.display_name as string | undefined) || user?.email?.split("@")[0] || "Instructor";

  return (
    <>
      <PageHeader eyebrow="Account" title={`Hi ${name}`} />
      <div className="space-y-4">
        <section className="card">
          {cloud ? (
            <>
              <p className="text-sm text-ink/70">Signed in as</p>
              <p className="font-semibold break-all">{user?.email}</p>
              <p className="mt-2 text-sm text-ink/70">
                Your plans, calendar and custom movements are private to your account and sync to every device you sign in on.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">This device only</p>
              <p className="mt-1 text-sm text-ink/70">
                Accounts are not configured, so everything is stored in this browser. Set up Supabase (see the README) to sign in and share data across devices.
              </p>
            </>
          )}
        </section>

        <section className="card-dark">
          <h2 className="display text-xl mb-3">Your library</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Seed movements" value={counts?.seed} />
            <Stat label="Your movements" value={counts?.mine} />
            <Stat label="Lesson plans" value={counts?.plans} />
            <Stat label="Classes logged" value={counts?.logs} />
          </dl>
        </section>

        {cloud && (
          <button className="btn-ghost w-full" onClick={signOut}>
            Sign out
          </button>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl bg-forest-deep/60 px-4 py-3">
      <dt className="text-mint/60">{label}</dt>
      <dd className="display text-2xl">{value ?? "–"}</dd>
    </div>
  );
}
