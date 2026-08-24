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

/** True for an empty collection — [] or {} — i.e. "no data here". */
function isEmpty(d: unknown): boolean {
  if (Array.isArray(d)) return d.length === 0;
  if (d && typeof d === "object") return Object.keys(d).length === 0;
  return d == null;
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
 * One-time migration: data entered before sync existed carries no change time
 * (timestamp 0). Stamp any populated collection that lacks one with a tiny
 * baseline (1ms past the epoch) so it participates in sync — it beats a device
 * that has never written that collection (0) and loses to any real later edit.
 * Without this, a computer's pre-sync roster would tie 0-vs-0 with a fresh
 * phone's blank roster.
 */
export function migrateLegacyStamps(): void {
  const updated = read<Record<string, number>>(KEYS.updated, {});
  let changed = false;
  for (const k of SYNCED_KEYS) {
    const data = read<unknown>(k, defaultFor(k));
    if (!isEmpty(data) && !(updated[k] > 0)) {
      updated[k] = 1;
      changed = true;
    }
  }
  if (changed) writeRaw(KEYS.updated, updated);
}

/**
 * Merge local and remote snapshots, collection by collection, newest wins.
 * On an exact timestamp tie, a populated collection beats an empty one, so
 * pre-sync data (timestamp 0) is never lost to a fresh device's blank slate.
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
    const takeRemote =
      !!r &&
      (r.u > l.u || (r.u === l.u && isEmpty(l.d) && !isEmpty(r.d)));
    if (takeRemote) {
      merged[k] = r as Coll;
      changedLocal = true;
    } else {
      merged[k] = l;
      // Push up when we hold data the server lacks or is behind on: a newer
      // stamp, no remote at all, or a tie where the server's copy is empty and
      // ours isn't. Never push an empty collection on its own.
      const serverBehind =
        !r || l.u > r.u || (r.u === l.u && !isEmpty(l.d) && isEmpty(r.d));
      if (!isEmpty(l.d) && serverBehind) changedRemote = true;
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
