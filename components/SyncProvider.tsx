"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { TEAM_PASSWORD } from "@/lib/appConfig";
import { storage } from "@/lib/storage";
import {
  applySnapshot,
  localSnapshot,
  mergeSnapshots,
  migrateLegacyStamps,
  onDataChanged,
  pullRemote,
  pushRemote,
} from "@/lib/sync";

type SyncStatus =
  | "boot" // first pull in flight
  | "local" // no cloud store configured — running on this device only
  | "syncing" // a push is in flight
  | "saved" // up to date with the cloud
  | "offline" // network unreachable, will retry
  | "error"; // the store rejected a write

const SyncContext = createContext<SyncStatus>("boot");

/** Re-render hook for list pages: bumps whenever a remote pull changes local
 *  data, so a page that read on mount re-reads and shows the new data. */
export function useDataVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => onDataChanged(() => setV((x) => x + 1)), []);
  return v;
}

export function useSyncStatus(): SyncStatus {
  return useContext(SyncContext);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export default function SyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<SyncStatus>("boot");
  const [booted, setBooted] = useState(false);
  const token = TEAM_PASSWORD;

  // one push at a time; coalesce writes that land mid-flight into one more run
  const pushing = useRef(false);
  const pendingPush = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Give any data entered before sync existed a baseline timestamp, so it
    // syncs up to the cloud instead of tying 0-vs-0 with a blank device.
    migrateLegacyStamps();

    async function doPush() {
      let snap = localSnapshot();
      let base = storage.getSyncRev();
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await pushRemote(token, snap, base);
        if (!res.configured) {
          if (!cancelled) setStatus("local");
          return;
        }
        if (res.ok) {
          storage.setSyncRev(res.rev);
          if (!cancelled) setStatus("saved");
          return;
        }
        if (res.conflict) {
          // Server moved on — fold its current state in and retry on top.
          const { merged, changedLocal } = mergeSnapshots(
            localSnapshot(),
            res.snapshot ?? null
          );
          if (changedLocal) applySnapshot(merged);
          storage.setSyncRev(res.rev);
          snap = localSnapshot();
          base = res.rev;
          continue;
        }
        break;
      }
      if (!cancelled) setStatus("error");
    }

    async function runPush() {
      if (pushing.current) {
        pendingPush.current = true;
        return;
      }
      pushing.current = true;
      if (!cancelled) setStatus("syncing");
      try {
        await doPush();
      } catch {
        if (!cancelled) setStatus("offline");
      } finally {
        pushing.current = false;
        if (pendingPush.current) {
          pendingPush.current = false;
          runPush();
        }
      }
    }

    async function doPull(): Promise<void> {
      // Don't fight an in-flight push — its rev bookkeeping would go stale.
      if (pushing.current) return;
      const res = await pullRemote(token);
      if (!res.configured) {
        if (!cancelled) setStatus("local");
        return;
      }
      if (res.snapshot) {
        const { merged, changedLocal, changedRemote } = mergeSnapshots(
          localSnapshot(),
          res.snapshot
        );
        if (changedLocal) applySnapshot(merged);
        storage.setSyncRev(res.rev);
        if (changedRemote) {
          runPush();
          return;
        }
      } else {
        // Store is empty — seed it from this device.
        storage.setSyncRev(res.rev);
        runPush();
        return;
      }
      if (!cancelled) setStatus("saved");
    }

    // Initial boot: pull the newest data before the app renders, so opening a
    // second device shows what the first one did. Time-boxed so a dead network
    // never hangs the app — it just starts local and syncs when it can.
    (async () => {
      try {
        await withTimeout(doPull(), 3500);
      } catch {
        if (!cancelled) setStatus("offline");
      } finally {
        if (!cancelled) setBooted(true);
      }
    })();

    // A local change queues a debounced push.
    const onWrite = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => runPush(), 1200);
    };
    window.addEventListener("roodogs:write", onWrite);

    // Coming back to the app (tab focus, unlocking the phone) re-pulls so the
    // device catches up with edits made elsewhere.
    const onVisible = () => {
      if (document.visibilityState === "visible") doPull().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      window.removeEventListener("roodogs:write", onWrite);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // token is constant; run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!booted) {
    // Brief splash while the first pull runs — keeps the first paint from
    // flashing stale local data before the cloud copy arrives.
    return (
      <div className="flex min-h-dvh items-center justify-center bg-pitch-dark text-emerald-100">
        <span className="animate-pulse text-sm font-medium">Syncing…</span>
      </div>
    );
  }

  return (
    <SyncContext.Provider value={status}>
      {children}
      <SyncBadge status={status} />
    </SyncContext.Provider>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  // "Saved" fades away after a moment; the other states stay put so the coach
  // always knows whether their work has left the device.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (status === "saved") {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2200);
      return () => clearTimeout(t);
    }
    setShowSaved(false);
  }, [status]);

  const meta: Record<
    SyncStatus,
    { label: string; dot: string; text: string } | null
  > = {
    boot: null,
    saved: showSaved
      ? { label: "Saved", dot: "bg-emerald-400", text: "text-emerald-700" }
      : null,
    syncing: { label: "Saving…", dot: "bg-amber-400", text: "text-amber-700" },
    local: {
      label: "This device only",
      dot: "bg-stone-400",
      text: "text-stone-500",
    },
    offline: {
      label: "Offline — will sync",
      dot: "bg-amber-400",
      text: "text-amber-700",
    },
    error: { label: "Sync error", dot: "bg-rose-500", text: "text-rose-700" },
  };

  const m = meta[status];
  if (!m) return null;

  return (
    // Bottom-left so it never covers page-header buttons: clears the bottom
    // nav on phones, sits in the sidebar's empty corner on desktop.
    <div
      className="pointer-events-none fixed bottom-24 left-3 z-50 flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/95 px-2.5 py-1 text-xs font-medium shadow-sm md:bottom-3"
      role="status"
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      <span className={m.text}>{m.label}</span>
    </div>
  );
}
