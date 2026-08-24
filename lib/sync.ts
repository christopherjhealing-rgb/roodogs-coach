// Cloud-sync glue between the local storage module and the /api/state store.
//
// The whole app state is a set of independent collections (players, drills,
// boards, …). Each carries a "last changed" timestamp. Sync merges by
// per-collection last-write-wins: whichever device touched a collection most
// recently owns it. That's the right granularity for one coach moving between
// a computer and a phone — editing the roster on the phone never clobbers a
// boards edit made earlier on the computer, and deletions within a collection
// propagate cleanly (unlike a naive per-item union).
//
// No React in here on purpose, so the merge logic stays unit-testable in node.

import {
  KEYS,
  SYNCED_KEYS,
  read,
  stampUpdated,
  writeRaw,
} from "./storage";

/** One collection's payload plus the time it last changed on some device. */
export interface Coll {
  u: number;
  d: unknown;
}

export type Snapshot = Record<string, Coll>;

/** Empty value for a collection that has never been written. */
function defaultFor(key: string): unknown {
  return key === KEYS.formation ? {} : [];
}

/** Gather every synced collection out of local storage into a snapshot. */
export function localSnapshot(): Snapshot {
  const updated = read<Record<string, number>>(KEYS.updated, {});
  const snap: Snapshot = {};
  for (const k of SYNCED_KEYS) {
    snap[k] = { u: updated[k] ?? 0, d: read(k, defaultFor(k)) };
  }
  return snap;
}

/**
 * Merge local and remote snapshots, collection by collection, newest wins.
 * `changedLocal` — the merge pulled in newer remote data we should apply here.
 * `changedRemote` — we hold newer data the server doesn't have yet, so push.
 */
export function mergeSnapshots(
  local: Snapshot,
  remote: Snapshot | null
): { merged: Snapshot; changedLocal: boolean; changedRemote: boolean } {
  const merged: Snapshot = {};
  let changedLocal = false;
  let changedRemote = false;
  for (const k of SYNCED_KEYS) {
    const l = local[k] ?? { u: 0, d: defaultFor(k) };
    const r = remote?.[k];
    if (r && r.u > l.u) {
      merged[k] = r;
      changedLocal = true;
    } else {
      merged[k] = l;
      // We hold newer data than the server for a collection we've actually
      // written (u > 0) — worth pushing. An untouched collection (u === 0)
      // never triggers a push on its own.
      if (l.u > 0 && (!r || l.u > r.u)) changedRemote = true;
    }
  }
  return { merged, changedLocal, changedRemote };
}

/** Write a merged/pulled snapshot into local storage without triggering a
 *  push (writeRaw is silent), preserving each collection's remote timestamp. */
export function applySnapshot(snap: Snapshot): void {
  for (const k of SYNCED_KEYS) {
    const c = snap[k];
    if (!c) continue;
    writeRaw(k, c.d);
    stampUpdated(k, c.u);
  }
  emitDataChanged();
}

// --- change notifications, so list pages re-read after a remote pull ---

const listeners = new Set<() => void>();

export function onDataChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitDataChanged(): void {
  for (const cb of listeners) cb();
}

// --- network ---

export interface PullResult {
  configured: boolean;
  snapshot: Snapshot | null;
  rev: number;
}

export interface PushResult {
  configured: boolean;
  ok: boolean;
  rev: number;
  /** On a rev conflict the server returns the current snapshot to merge. */
  conflict?: boolean;
  snapshot?: Snapshot | null;
}

export async function pullRemote(token: string): Promise<PullResult> {
  const res = await fetch("/api/state", {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sync pull ${res.status}`);
  return (await res.json()) as PullResult;
}

export async function pushRemote(
  token: string,
  snapshot: Snapshot,
  baseRev: number
): Promise<PushResult> {
  const res = await fetch("/api/state", {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ snapshot, baseRev }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`sync push ${res.status}`);
  return (await res.json()) as PushResult;
}
