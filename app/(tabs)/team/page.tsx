"use client";

import { useEffect, useState } from "react";
import { newId, storage } from "@/lib/storage";
import type { Player } from "@/lib/types";
import FormationView from "./FormationView";
import PlayerForm, { type PlayerFormData } from "./PlayerForm";

const UNIT_LABEL = { forwards: "Forwards", backs: "Backs" } as const;

/** Manual order first; otherwise jersey number, then name. */
function rosterCompare(a: Player, b: Player): number {
  if (a.order != null && b.order != null) return a.order - b.order;
  if (a.order != null) return -1;
  if (b.order != null) return 1;
  const aj = a.jersey ?? 999;
  const bj = b.jersey ?? 999;
  if (aj !== bj) return aj - bj;
  return a.name.localeCompare(b.name);
}

export default function TeamPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<"list" | "formation">("list");

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

  const roster = players.filter((p) => p.active).sort(rosterCompare);
  const archived = players
    .filter((p) => !p.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  /** Move a roster card up/down, materialising the manual order. */
  function movePlayer(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= roster.length) return;
    const ids = roster.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const orderOf = new Map(ids.map((id, i) => [id, i]));
    save(
      players.map((p) =>
        orderOf.has(p.id) ? { ...p, order: orderOf.get(p.id) } : p
      )
    );
  }

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
        <div className="flex shrink-0 gap-2">
          {loaded && roster.length > 0 && (
            <button
              onClick={() =>
                setView((v) => (v === "list" ? "formation" : "list"))
              }
              aria-pressed={view === "formation"}
              className={`min-h-[48px] rounded-lg border px-3 font-semibold ${
                view === "formation"
                  ? "border-pitch bg-pitch text-white"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              Team shape
            </button>
          )}
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
        </div>
      </header>

      {adding && (
        <div className="w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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

      {view === "formation" && roster.length > 0 && (
        <section className="w-full max-w-3xl rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <FormationView roster={roster} />
        </section>
      )}

      <ul
        className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${
          view === "formation" ? "hidden" : ""
        }`}
      >
        {roster.map((player, index) =>
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
            <li
              key={player.id}
              className="flex items-stretch overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
            >
              <button
                onClick={() => {
                  setEditingId(player.id);
                  setAdding(false);
                }}
                className="flex min-h-[56px] min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left active:bg-stone-50"
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
              </button>
              <span className="flex shrink-0 flex-col border-l border-stone-100">
                <button
                  onClick={() => movePlayer(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${player.name} up`}
                  className="min-h-[28px] flex-1 px-2.5 text-sm text-stone-400 hover:text-pitch disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => movePlayer(index, 1)}
                  disabled={index === roster.length - 1}
                  aria-label={`Move ${player.name} down`}
                  className="min-h-[28px] flex-1 border-t border-stone-100 px-2.5 text-sm text-stone-400 hover:text-pitch disabled:opacity-30"
                >
                  ▼
                </button>
              </span>
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
