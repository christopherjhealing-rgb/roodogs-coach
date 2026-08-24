"use client";

import { useEffect, useState } from "react";
import { newId, storage } from "@/lib/storage";
import { ensureSeedData } from "@/lib/ensureSeed";
import type { Board, Drill, Player, Session } from "@/lib/types";
import PresentMode from "./PresentMode";
import SessionBuilder from "./SessionBuilder";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rollOpenId, setRollOpenId] = useState<string | null>(null);
  const [presentingId, setPresentingId] = useState<string | null>(null);

  useEffect(() => {
    // Seed drills/boards here too, so the builder isn't empty if this tab
    // is opened before the Drills tab ever has been.
    ensureSeedData();
    setDrills(storage.getDrills());
    setSessions(storage.getSessions());
    setPlayers(storage.getPlayers().filter((p) => p.active));
    setBoards(storage.getBoards());
    setLoaded(true);
  }, []);

  function save(next: Session[]) {
    setSessions(next);
    storage.setSessions(next);
  }

  function addSession(data: Omit<Session, "id">) {
    save([...sessions, { id: newId(), ...data }]);
    setAdding(false);
  }

  function updateSession(id: string, data: Omit<Session, "id">) {
    save(sessions.map((s) => (s.id === id ? { id, ...data } : s)));
    setEditingId(null);
  }

  function duplicateSession(session: Session) {
    const copy: Session = {
      id: newId(),
      date: new Date().toISOString().slice(0, 10),
      drillIds: [...session.drillIds],
      notes: session.notes,
    };
    save([...sessions, copy]);
    setEditingId(copy.id);
    setAdding(false);
  }

  function toggleAttendee(session: Session, playerId: string) {
    const current = session.attendeeIds ?? [];
    const next = current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId];
    save(
      sessions.map((s) =>
        s.id === session.id ? { ...s, attendeeIds: next } : s
      )
    );
  }

  const byId = new Map(drills.map((d) => [d.id, d]));
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  function sessionMins(session: Session): number {
    return session.drillIds.reduce(
      (sum, id) => sum + (byId.get(id)?.durationMins ?? 0),
      0
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          {loaded && sorted.length > 0 && (
            <p className="text-sm text-stone-500">
              {sorted.length} {sorted.length === 1 ? "session" : "sessions"}{" "}
              planned
            </p>
          )}
        </div>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="min-h-[48px] rounded-lg bg-pitch px-4 font-semibold text-white"
          >
            + Plan session
          </button>
        )}
      </header>

      {adding && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">New session</h2>
          <SessionBuilder
            drills={drills}
            submitLabel="Save session"
            onSubmit={addSession}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {loaded && sorted.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <span className="text-4xl" aria-hidden>
            📋
          </span>
          <p className="font-semibold">No sessions planned yet</p>
          <p className="text-sm text-stone-500">
            Build your first training plan from the drill library — aim for
            about an hour.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-1 min-h-[48px] rounded-lg bg-pitch px-5 font-semibold text-white"
          >
            Plan your first session
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.map((session) =>
          editingId === session.id ? (
            <li
              key={session.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <h2 className="mb-3 font-semibold">Edit session</h2>
              <SessionBuilder
                initial={session}
                drills={drills}
                submitLabel="Save changes"
                onSubmit={(data) => updateSession(session.id, data)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={session.id}
              className="rounded-xl border border-stone-200 bg-white shadow-sm"
            >
              <button
                onClick={() => {
                  setEditingId(session.id);
                  setAdding(false);
                }}
                className="flex w-full flex-col gap-1 px-4 pt-3 text-left active:bg-stone-50"
              >
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span className="font-semibold">
                    {formatDate(session.date)}
                  </span>
                  <span className="shrink-0 text-sm text-stone-500">
                    {sessionMins(session)} min
                  </span>
                </span>
                <span className="text-sm text-stone-600">
                  {session.drillIds.length === 0
                    ? "No drills picked yet"
                    : session.drillIds
                        .map((id) => byId.get(id)?.name)
                        .filter(Boolean)
                        .join(" · ")}
                </span>
                {session.notes && (
                  <span className="text-xs text-stone-400">
                    {session.notes}
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <div className="flex">
                  {session.drillIds.length > 0 && (
                    <button
                      onClick={() => setPresentingId(session.id)}
                      className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-pitch"
                    >
                      ▶ Present
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setRollOpenId(rollOpenId === session.id ? null : session.id)
                    }
                    className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-stone-500"
                  >
                    Roll call ({(session.attendeeIds ?? []).length}/
                    {players.length})
                  </button>
                </div>
                <button
                  onClick={() => duplicateSession(session)}
                  className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-pitch"
                >
                  Duplicate
                </button>
              </div>
              {rollOpenId === session.id && (
                <div className="flex flex-wrap gap-1.5 border-t border-stone-100 px-4 py-3">
                  {players.length === 0 && (
                    <p className="text-sm text-stone-500">
                      Add players on the Team tab first.
                    </p>
                  )}
                  {players.map((p) => {
                    const here = (session.attendeeIds ?? []).includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleAttendee(session, p.id)}
                        aria-pressed={here}
                        className={`min-h-[44px] rounded-full border px-3 text-sm font-medium ${
                          here
                            ? "border-pitch bg-pitch text-white"
                            : "border-stone-300 bg-white text-stone-500"
                        }`}
                      >
                        {here ? "✓ " : ""}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          )
        )}
      </ul>

      {presentingId &&
        (() => {
          const session = sessions.find((s) => s.id === presentingId);
          if (!session) return null;
          const sessionDrills = session.drillIds
            .map((id) => byId.get(id))
            .filter((d): d is Drill => d !== undefined);
          return (
            <PresentMode
              drills={sessionDrills}
              boards={new Map(boards.map((b) => [b.id, b]))}
              onClose={() => setPresentingId(null)}
            />
          );
        })()}
    </div>
  );
}
