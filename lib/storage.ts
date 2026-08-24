// Single storage module for all app state. Everything lives in localStorage for v1;
// components only ever talk to this interface, so swapping in Vercel KV or a
// database later means changing this file and nothing else.
//
// A thin cloud-sync layer (lib/sync.ts) sits on top: every write to a "synced"
// collection stamps a per-collection timestamp and fires a `roodogs:write`
// event, which the sync provider debounces into a push. Applying a pulled
// snapshot writes silently (see writeRaw) so it never bounces back up.

import type { Board, Drill, Match, MatchEvent, Player, Session } from "./types";

export const KEYS = {
  players: "roodogs.players",
  drills: "roodogs.drills",
  sessions: "roodogs.sessions",
  matches: "roodogs.matches",
  matchEvents: "roodogs.matchEvents",
  boards: "roodogs.boards",
  formation: "roodogs.formation",
  seededDrillIds: "roodogs.seededDrillIds",
  seededBoardIds: "roodogs.seededBoardIds",
  // sync bookkeeping — never synced themselves
  updated: "roodogs.updated",
  syncRev: "roodogs.syncRev",
} as const;

/** The collections that travel between devices via cloud sync. */
export const SYNCED_KEYS: string[] = [
  KEYS.players,
  KEYS.drills,
  KEYS.sessions,
  KEYS.matches,
  KEYS.matchEvents,
  KEYS.boards,
  KEYS.formation,
  KEYS.seededDrillIds,
  KEYS.seededBoardIds,
];

const SYNCED = new Set(SYNCED_KEYS);

export function read<T>(key: string, fallback: T): T {
  // Rendering on the server (or with storage blocked) just yields the fallback;
  // components re-read on the client after mount.
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** Low-level write with no side effects — used for bookkeeping keys and for
 *  applying pulled snapshots (which must not trigger another push). */
export function writeRaw<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — nothing sensible to do in v1.
  }
}

/** Record the moment a synced collection last changed, for sync's per-collection
 *  last-write-wins merge. */
export function stampUpdated(key: string, ms: number): void {
  if (typeof window === "undefined") return;
  const map = read<Record<string, number>>(KEYS.updated, {});
  map[key] = ms;
  writeRaw(KEYS.updated, map);
}

function write<T>(key: string, value: T): void {
  // Skip no-op writes (e.g. re-saving an unchanged collection on every page
  // mount) so they don't stamp a fresh time or trigger a needless sync push.
  if (typeof window !== "undefined" && SYNCED.has(key)) {
    const next = JSON.stringify(value);
    if (window.localStorage.getItem(key) === next) return;
    writeRaw(key, value);
    stampUpdated(key, Date.now());
    window.dispatchEvent(new CustomEvent("roodogs:write", { detail: { key } }));
    return;
  }
  writeRaw(key, value);
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const storage = {
  getPlayers(): Player[] {
    return read<Player[]>(KEYS.players, []);
  },
  setPlayers(players: Player[]): void {
    write(KEYS.players, players);
  },

  getDrills(): Drill[] {
    return read<Drill[]>(KEYS.drills, []);
  },
  setDrills(drills: Drill[]): void {
    write(KEYS.drills, drills);
  },

  getSessions(): Session[] {
    return read<Session[]>(KEYS.sessions, []);
  },
  setSessions(sessions: Session[]): void {
    write(KEYS.sessions, sessions);
  },

  getMatches(): Match[] {
    return read<Match[]>(KEYS.matches, []);
  },
  setMatches(matches: Match[]): void {
    write(KEYS.matches, matches);
  },

  /** Team-shape slot assignments: slot id → player id. */
  getFormation(): Record<string, string> {
    return read<Record<string, string>>(KEYS.formation, {});
  },
  setFormation(map: Record<string, string>): void {
    write(KEYS.formation, map);
  },

  getBoards(): Board[] {
    return read<Board[]>(KEYS.boards, []);
  },
  setBoards(boards: Board[]): void {
    write(KEYS.boards, boards);
  },

  getMatchEvents(matchId?: string): MatchEvent[] {
    const events = read<MatchEvent[]>(KEYS.matchEvents, []);
    return matchId ? events.filter((e) => e.matchId === matchId) : events;
  },
  setMatchEvents(events: MatchEvent[]): void {
    write(KEYS.matchEvents, events);
  },

  // Seed-tracking sets — which starter drills/boards have ever been added, so
  // upgrades merge new content without resurrecting ones the coach deleted.
  // Synced so a deletion on one device doesn't reappear from another.
  getSeededDrillIds(): string[] {
    return read<string[]>(KEYS.seededDrillIds, []);
  },
  setSeededDrillIds(ids: string[]): void {
    write(KEYS.seededDrillIds, ids);
  },
  getSeededBoardIds(): string[] {
    return read<string[]>(KEYS.seededBoardIds, []);
  },
  setSeededBoardIds(ids: string[]): void {
    write(KEYS.seededBoardIds, ids);
  },

  // Per-collection change times and the last server revision this device saw.
  getUpdatedMap(): Record<string, number> {
    return read<Record<string, number>>(KEYS.updated, {});
  },
  getSyncRev(): number {
    return read<number>(KEYS.syncRev, 0);
  },
  setSyncRev(rev: number): void {
    writeRaw(KEYS.syncRev, rev);
  },
};
