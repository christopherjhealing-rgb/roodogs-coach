"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LocalRepo, SupabaseRepo, type Repo } from "@/lib/repo";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface DataContextValue {
  repo: Repo | null;
  /** Signed-in Supabase user, or null in local mode / signed out. */
  user: User | null;
  /** True when Supabase is configured (accounts + cloud data). */
  cloud: boolean;
  /** Still resolving the session on first paint. */
  loading: boolean;
  /** Bumps whenever a write happens so list pages re-read. */
  version: number;
  bump: () => void;
  signOut: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const cloud = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(cloud);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!cloud) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [cloud]);

  const repo = useMemo<Repo | null>(() => {
    if (!cloud) return new LocalRepo();
    const supabase = getBrowserSupabase();
    if (!supabase || !user) return null;
    return new SupabaseRepo(supabase, user.id);
  }, [cloud, user]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({ repo, user, cloud, loading, version, bump, signOut }),
    [repo, user, cloud, loading, version, bump, signOut],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

/**
 * Loads something from the repo and re-runs whenever a write bumps the data
 * version. Returns undefined while loading.
 */
export function useRepoQuery<T>(
  fn: (repo: Repo) => Promise<T>,
  deps: unknown[] = [],
): { data: T | undefined; error: string | null; reload: () => void } {
  const { repo, version } = useData();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    fn(repo)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, version, tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
