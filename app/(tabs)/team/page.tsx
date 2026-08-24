"use client";

import { useEffect, useState } from "react";
import { newId, storage } from "@/lib/storage";
import { useDataVersion } from "@/components/SyncProvider";
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
  const [dragId, setDragId] = useState<string | null>(null);
  const dataVersion = useDataVersion();

  // localStorage isn't there during server render, so read after mount;
  // re-read when a cloud sync pulls newer data from another device.
  useEffect(() => {
    setPlayers(storage.getPlayers());
    setLoaded(true);
  }, [dataVersion]);

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
  const forwards = roster.filter((p) => p.unit === "forwards");
  const backs = roster.filter((p) => p.unit === "backs");
  const unassigned = roster.filter((p) => !p.unit);
  // Split the roster into forwards and backs once any player has a unit set;
  // before that it's just one plain list so a new roster never looks broken.
  const splitByUnit = forwards.length > 0 || backs.length > 0;
  const archived = players
    .filter((p) => !p.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  /** Reorder by drag: put dragged player into the slot of the card under
   *  the pointer, materialising the manual order for the whole roster. */
  function moveTo(dragId: string, overId: string) {
    if (dragId === overId) return;
    const ids = roster.map((p) => p.id).filter((id) => id !== dragId);
    const at = ids.indexOf(overId);
    if (at < 0) return;
    ids.splice(at, 0, dragId);
    const orderOf = new Map(ids.map((id, i) => [id, i]));
    save(
      players.map((p) =>
        orderOf.has(p.id) ? { ...p, order: orderOf.get(p.id) } : p
      )
    );
  }

  function resetOrder() {
    save(players.map((p) => ({ ...p, order: undefined })));
  }

  const hasManualOrder = players.some((p) => p.order != null);

  function onHandlePointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    const li = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => (el as HTMLElement).closest?.("[data-pid]"))
      .find(Boolean) as HTMLElement | undefined;
    const overId = li?.dataset.pid;
    if (overId && overId !== dragId) moveTo(dragId, overId);
  }

  // One roster card — either the inline edit form or the tappable row.
  const renderCard = (player: Player) =>
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
        data-pid={player.id}
        className={`flex items-stretch overflow-hidden rounded-xl border bg-white shadow-sm transition-opacity ${
          dragId === player.id
            ? "border-pitch opacity-60"
            : "border-stone-200"
        }`}
      >
        <button
          onPointerDown={(e) => onHandlePointerDown(e, player.id)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={() => setDragId(null)}
          onPointerCancel={() => setDragId(null)}
          aria-label={`Drag to reorder ${player.name}`}
          className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center border-r border-stone-100 text-stone-300 hover:text-pitch active:cursor-grabbing"
        >
          ⠿
        </button>
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
      </li>
    );

  // A titled group of cards (Forwards / Backs / No unit set).
  const renderSection = (title: string, list: Player[]) =>
    list.length === 0 ? null : (
      <section key={title} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-pitch">
            {title}
          </h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
            {list.length}
          </span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(renderCard)}
        </ul>
      </section>
    );

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

      {view === "list" &&
        roster.length > 0 &&
        (splitByUnit ? (
          <div className="flex flex-col gap-5">
            {renderSection("Forwards", forwards)}
            {renderSection("Backs", backs)}
            {renderSection("No unit set", unassigned)}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map(renderCard)}
          </ul>
        ))}

      {view === "list" && hasManualOrder && (
        <button
          onClick={resetOrder}
          className="min-h-[44px] w-fit rounded-lg px-3 text-sm font-medium text-stone-500 underline underline-offset-2"
        >
          Reset to number order
        </button>
      )}

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
