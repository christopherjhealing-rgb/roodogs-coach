"use client";

import { useEffect, useState } from "react";
import { newId, storage } from "@/lib/storage";
import type { Player } from "@/lib/types";
import PlayerForm, { type PlayerFormData } from "./PlayerForm";

const UNIT_LABEL = { forwards: "Forwards", backs: "Backs" } as const;

export default function TeamPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // localStorage isn't there during server render, so read after mount.
  useEffect(() => {
    setPlayers(storage.getPlayers());
    setLoaded(true);
  }, []);

  function save(next: Player[]) {
    setPlayers(next);
    storage.setPlayers(next);
  }

  function addPlayer(data: PlayerFormData) {
    save([...players, { id: newId(), active: true, ...data }]);
    setAdding(false);
  }

  function updatePlayer(id: string, data: PlayerFormData) {
    save(players.map((p) => (p.id === id ? { ...p, ...data } : p)));
    setEditingId(null);
  }

  function setActive(id: string, active: boolean) {
    save(players.map((p) => (p.id === id ? { ...p, active } : p)));
    setEditingId(null);
  }

  const roster = players
    .filter((p) => p.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  const archived = players
    .filter((p) => !p.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          {loaded && roster.length > 0 && (
            <p className="text-sm text-stone-500">
              {roster.length} {roster.length === 1 ? "player" : "players"} on
              the roster
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
            + Add player
          </button>
        )}
      </header>

      {adding && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">New player</h2>
          <PlayerForm
            submitLabel="Add to roster"
            onSubmit={addPlayer}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {loaded && roster.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <span className="text-4xl" aria-hidden>
            🏉
          </span>
          <p className="font-semibold">No Roodogs on the roster yet</p>
          <p className="text-sm text-stone-500">
            Add your first player and you&apos;re ready to start planning
            sessions and running match days.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-1 min-h-[48px] rounded-lg bg-pitch px-5 font-semibold text-white"
          >
            Add your first player
          </button>
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {roster.map((player) =>
          editingId === player.id ? (
            <li
              key={player.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Edit player</h2>
                <button
                  onClick={() => setActive(player.id, false)}
                  className="min-h-[48px] rounded-lg px-3 text-sm font-medium text-amber-700"
                >
                  Archive
                </button>
              </div>
              <PlayerForm
                initial={player}
                submitLabel="Save"
                onSubmit={(data) => updatePlayer(player.id, data)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={player.id}>
              <button
                onClick={() => {
                  setEditingId(player.id);
                  setAdding(false);
                }}
                className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm active:bg-stone-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {player.jersey != null && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pitch text-sm font-bold text-white">
                      {player.jersey}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-semibold">{player.name}</span>
                    {(player.position || player.unit) && (
                      <span className="block truncate text-sm text-stone-500">
                        {[player.position, player.unit && UNIT_LABEL[player.unit]]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                    {player.notes && (
                      <span className="block truncate text-xs text-stone-400">
                        {player.notes}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-stone-400" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          )
        )}
      </ul>

      {archived.length > 0 && (
        <section className="mt-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="min-h-[48px] w-full rounded-lg text-left text-sm font-medium text-stone-500"
          >
            {showArchived ? "▾" : "▸"} Archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-2">
              {archived.map((player) => (
                <li
                  key={player.id}
                  className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-stone-500">
                      {player.name}
                    </span>
                    {player.notes && (
                      <span className="block truncate text-sm text-stone-400">
                        {player.notes}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setActive(player.id, true)}
                    className="min-h-[48px] shrink-0 rounded-lg px-3 text-sm font-semibold text-pitch"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
