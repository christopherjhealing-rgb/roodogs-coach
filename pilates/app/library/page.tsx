"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Empty from "@/components/Empty";
import MovementFilters from "@/components/library/MovementFilters";
import MovementCard from "@/components/library/MovementCard";
import { useRepoQuery } from "@/components/DataProvider";
import { EMPTY_FILTER, filterMovements, type MovementFilter } from "@/lib/search";

const FILTER_KEY = "bloom:libraryFilter";

export default function LibraryPage() {
  const [filter, setFilter] = useState<MovementFilter>(EMPTY_FILTER);
  const { data: all, error } = useRepoQuery((repo) => repo.listMovements());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTER_KEY);
      if (raw) setFilter({ ...EMPTY_FILTER, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(filter));
    } catch {}
  }, [filter]);

  const list = useMemo(() => (all ? filterMovements(all, filter) : []), [all, filter]);

  return (
    <>
      <PageHeader
        eyebrow="Movement library"
        title="Library"
        action={
          <Link href="/library/new" className="btn-primary btn-sm">
            + Add
          </Link>
        }
      />
      <MovementFilters value={filter} onChange={setFilter} />
      {error && <p className="mt-4 text-sm text-red-200">{error}</p>}
      <p className="mt-4 mb-2 text-xs uppercase tracking-widest text-mint/50">
        {all ? `${list.length} of ${all.length} movements` : "Loading…"}
      </p>
      <div className="space-y-3">
        {all && list.length === 0 && (
          <Empty
            title="Nothing matches"
            body="Try fewer filters, or add your own movement."
            action={
              <button className="btn-ghost btn-sm" onClick={() => setFilter(EMPTY_FILTER)}>
                Clear filters
              </button>
            }
          />
        )}
        {list.map((m) => (
          <MovementCard key={m.id} movement={m} />
        ))}
      </div>
    </>
  );
}
