"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  clockElapsedMs,
  countEvents,
  fairnessSummary,
  finalWhistleMs,
  formatClock,
  isClockRunning,
  onFieldIds,
  playerGameTimeMs,
  suggestSub,
} from "@/lib/gameTime";
import { newId, storage } from "@/lib/storage";
import type { Match, MatchEvent, Player } from "@/lib/types";

/** Player name prefixed with their jersey number, when they have one. */
function withNo(p: { name: string; jersey?: number }): string {
  return p.jersey != null ? `#${p.jersey} ${p.name}` : p.name;
}

interface UndoToast {
  label: string;
  eventIds: string[];
}

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [starterIds, setStarterIds] = useState<string[]>([]);
  const [selectedOn, setSelectedOn] = useState<string | null>(null);
  const [selectedBench, setSelectedBench] = useState<string | null>(null);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const m = storage.getMatches().find((x) => x.id === matchId) ?? null;
    setMatch(m);
    setPlayers(storage.getPlayers());
    setEvents(storage.getMatchEvents(matchId));
    setLoaded(true);
  }, [matchId]);

  const running = match ? isClockRunning(match.clockPeriods ?? []) : false;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  function saveMatch(updated: Match) {
    setMatch(updated);
    storage.setMatches(
      storage.getMatches().map((m) => (m.id === updated.id ? updated : m))
    );
  }

  function saveEvents(nextForMatch: MatchEvent[]) {
    setEvents(nextForMatch);
    const others = storage
      .getMatchEvents()
      .filter((e) => e.matchId !== matchId);
    storage.setMatchEvents([...others, ...nextForMatch]);
  }

  function showToast(label: string, eventIds: string[]) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ label, eventIds });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function undoToast() {
    if (!toast) return;
    saveEvents(events.filter((e) => !toast.eventIds.includes(e.id)));
    setToast(null);
  }

  if (!loaded) return null;

  if (!match) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-24 text-center">
        <p className="font-semibold">Match not found</p>
        <Link href="/match" className="font-medium text-pitch underline">
          Back to matches
        </Link>
      </div>
    );
  }

  const squad = players.filter((p) =>
    (match.squadIds ?? players.map((x) => x.id)).includes(p.id)
  );
  const byId = new Map(squad.map((p) => [p.id, p]));
  const periods = match.clockPeriods ?? [];
  const refMs =
    match.status === "finished" ? finalWhistleMs(periods) : now;
  const elapsed = clockElapsedMs(periods, refMs);
  const fieldIds = onFieldIds(events);
  const onField = fieldIds
    .map((id) => byId.get(id))
    .filter((p): p is Player => p !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
  const bench = squad
    .filter((p) => !fieldIds.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const timeById = new Map(
    squad.map((p) => [
      p.id,
      playerGameTimeMs(p.id, events, periods, refMs),
    ])
  );
  const maxTime = Math.max(0, ...timeById.values());
  // "Falling behind": under 60% of the leader once the game has settled in.
  const behindThreshold =
    elapsed > 4 * 60_000 ? maxTime * 0.6 : -1;

  const timeOf = (p: Player) => ({ id: p.id, ms: timeById.get(p.id) ?? 0 });
  const fairness = fairnessSummary(squad.map(timeOf));
  const suggestion =
    match.status === "live" && running && elapsed > 4 * 60_000
      ? suggestSub(onField.map(timeOf), bench.map(timeOf), 4 * 60_000)
      : null;

  function kickOff() {
    if (!match) return;
    const t = Date.now();
    const subs: MatchEvent[] = starterIds.map((playerId) => ({
      id: newId(),
      matchId,
      playerId,
      type: "sub_on",
      timestampMs: t,
    }));
    saveEvents([...events, ...subs]);
    saveMatch({ ...match, status: "live", clockPeriods: [{ startMs: t }] });
    setNow(t);
  }

  function pauseResume() {
    if (!match) return;
    const t = Date.now();
    if (running) {
      const closed = periods.map((p, i) =>
        i === periods.length - 1 && p.endMs === undefined
          ? { ...p, endMs: t }
          : p
      );
      saveMatch({ ...match, clockPeriods: closed });
    } else {
      saveMatch({ ...match, clockPeriods: [...periods, { startMs: t }] });
      setNow(t);
    }
  }

  function fullTime() {
    if (!match) return;
    if (!window.confirm("Full-time — finish the match?")) return;
    const t = Date.now();
    const closed = periods.map((p, i) =>
      i === periods.length - 1 && p.endMs === undefined
        ? { ...p, endMs: t }
        : p
    );
    saveMatch({ ...match, status: "finished", clockPeriods: closed });
    setToast(null);
  }

  function doSwap(offId: string, onIdNew: string) {
    const t = Date.now();
    const off: MatchEvent = {
      id: newId(),
      matchId,
      playerId: offId,
      type: "sub_off",
      timestampMs: t,
    };
    const on: MatchEvent = {
      id: newId(),
      matchId,
      playerId: onIdNew,
      type: "sub_on",
      timestampMs: t,
    };
    saveEvents([...events, off, on]);
    setSelectedOn(null);
    setSelectedBench(null);
    showToast(
      `Sub: ${byId.get(onIdNew)?.name ?? "?"} on for ${byId.get(offId)?.name ?? "?"}`,
      [off.id, on.id]
    );
  }

  function trySwap(onId: string | null, benchId: string | null) {
    setSelectedOn(onId);
    setSelectedBench(benchId);
    if (!onId || !benchId) return;
    doSwap(onId, benchId);
  }

  const STAT_LABEL = {
    try: "Try",
    tackle: "Tackle",
    steal: "Steal",
    lost: "Ball lost",
  } as const;

  function recordStat(
    playerId: string,
    type: "try" | "tackle" | "steal" | "lost"
  ) {
    const e: MatchEvent = {
      id: newId(),
      matchId,
      playerId,
      type,
      timestampMs: Date.now(),
    };
    saveEvents([...events, e]);
    showToast(
      `${STAT_LABEL[type]} — ${byId.get(playerId)?.name ?? "?"}${type === "lost" ? "" : "!"}`,
      [e.id]
    );
  }

  const ourTries = events.filter((e) => e.type === "try").length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-4">
      <header className="flex items-center justify-between">
        <Link href="/match" className="min-h-[44px] py-2 text-sm text-stone-500">
          ‹ Matches
        </Link>
        <span className="text-sm font-semibold">vs {match.opponent}</span>
      </header>

      {match.status === "setup" && (
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">Starting line-up</h1>
          <p className="text-sm text-stone-500">
            Tap the players starting on the field ({starterIds.length}{" "}
            picked). Everyone else starts on the bench — rolling subs from
            kick-off.
          </p>
          <div className="flex flex-wrap gap-2">
            {squad
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => {
                const on = starterIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      setStarterIds((prev) =>
                        on
                          ? prev.filter((x) => x !== p.id)
                          : [...prev, p.id]
                      )
                    }
                    aria-pressed={on}
                    className={`min-h-[48px] rounded-full border px-4 font-medium ${
                      on
                        ? "border-pitch bg-pitch text-white"
                        : "border-stone-300 bg-white text-stone-600"
                    }`}
                  >
                    {withNo(p)}
                  </button>
                );
              })}
          </div>
          <button
            onClick={kickOff}
            disabled={starterIds.length === 0}
            className="min-h-[56px] rounded-xl bg-pitch text-lg font-bold text-white disabled:opacity-40"
          >
            Kick off 🏉
          </button>
        </section>
      )}

      {match.status === "live" && (
        <>
          <section className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b border-stone-200 bg-stone-100/95 px-4 py-2 backdrop-blur">
            <div>
              <div className="text-3xl font-bold tabular-nums">
                {formatClock(elapsed)}
              </div>
              <div className="text-xs text-stone-500">
                {match.halfLengthMins}-minute halves · {ourTries}{" "}
                {ourTries === 1 ? "try" : "tries"}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={pauseResume}
                className={`min-h-[48px] rounded-lg px-4 font-semibold ${
                  running
                    ? "bg-amber-500 text-white"
                    : "bg-pitch text-white"
                }`}
              >
                {running ? "Pause" : "Resume"}
              </button>
              <button
                onClick={fullTime}
                className="min-h-[48px] rounded-lg border border-stone-300 bg-white px-3 font-semibold text-stone-600"
              >
                Full-time
              </button>
            </div>
          </section>

          {!running && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <h2 className="text-sm font-bold text-amber-900">
                Break — fairness check
              </h2>
              <p className="text-sm text-amber-800">
                Gap between most and least game time:{" "}
                <strong>{formatClock(fairness.spreadMs)}</strong> (average{" "}
                {formatClock(fairness.avgMs)}).
              </p>
              {fairness.needsMinutes.length > 0 ? (
                <p className="pt-1 text-sm font-medium text-amber-900">
                  Needs more minutes:{" "}
                  {fairness.needsMinutes
                    .map((id) => byId.get(id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : (
                <p className="pt-1 text-sm text-amber-800">
                  Everyone&apos;s getting a fair run. 👏
                </p>
              )}
            </section>
          )}

          {suggestion && (
            <section className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2">
              <p className="text-sm text-sky-900">
                <span className="font-bold">Fairness tip:</span>{" "}
                {byId.get(suggestion.onId)?.name} on for{" "}
                {byId.get(suggestion.offId)?.name}
              </p>
              <button
                onClick={() => doSwap(suggestion.offId, suggestion.onId)}
                className="min-h-[44px] shrink-0 rounded-lg bg-sky-600 px-3 text-sm font-bold text-white"
              >
                Make the sub
              </button>
            </section>
          )}

          <p className="text-center text-xs text-stone-400">
            Tap one player on each side to swap them.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <section className="flex flex-col gap-1.5">
              <h2 className="text-center text-xs font-bold uppercase tracking-wide text-pitch">
                On field ({onField.length})
              </h2>
              {onField.map((p) => {
                const selected = selectedOn === p.id;
                const t = timeById.get(p.id) ?? 0;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border bg-white p-2 shadow-sm ${
                      selected
                        ? "border-pitch ring-2 ring-pitch"
                        : "border-stone-200"
                    }`}
                  >
                    <button
                      onClick={() =>
                        trySwap(selected ? null : p.id, selectedBench)
                      }
                      className="flex min-h-[48px] w-full items-center justify-between gap-1 text-left"
                    >
                      <span className="truncate font-semibold">{withNo(p)}</span>
                      <span
                        className={`shrink-0 text-sm tabular-nums ${
                          behindThreshold >= 0 && t < behindThreshold
                            ? "font-bold text-amber-600"
                            : "text-stone-500"
                        }`}
                      >
                        {formatClock(t)}
                      </span>
                    </button>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => recordStat(p.id, "try")}
                        className="min-h-[48px] rounded-lg bg-emerald-600 text-sm font-bold text-white"
                      >
                        Try
                      </button>
                      <button
                        onClick={() => recordStat(p.id, "tackle")}
                        className="min-h-[48px] rounded-lg bg-sky-600 text-sm font-bold text-white"
                      >
                        Tackle
                      </button>
                      <button
                        onClick={() => recordStat(p.id, "steal")}
                        className="min-h-[44px] rounded-lg bg-violet-600 text-xs font-bold text-white"
                      >
                        Steal
                      </button>
                      <button
                        onClick={() => recordStat(p.id, "lost")}
                        className="min-h-[44px] rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-500"
                      >
                        Lost
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="flex flex-col gap-1.5">
              <h2 className="text-center text-xs font-bold uppercase tracking-wide text-stone-500">
                Bench ({bench.length})
              </h2>
              {bench.map((p) => {
                const selected = selectedBench === p.id;
                const t = timeById.get(p.id) ?? 0;
                const behind = behindThreshold >= 0 && t < behindThreshold;
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      trySwap(selectedOn, selected ? null : p.id)
                    }
                    className={`flex min-h-[56px] w-full items-center justify-between gap-1 rounded-xl border bg-white p-2 text-left shadow-sm ${
                      selected
                        ? "border-pitch ring-2 ring-pitch"
                        : behind
                          ? "border-amber-400"
                          : "border-stone-200"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {withNo(p)}
                      </span>
                      {behind && (
                        <span className="text-xs font-medium text-amber-600">
                          Needs minutes
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-stone-500">
                      {formatClock(t)}
                    </span>
                  </button>
                );
              })}
            </section>
          </div>
        </>
      )}

      {match.status === "finished" && (
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">Full-time</h1>
          <p className="text-sm text-stone-600">
            {ourTries} {ourTries === 1 ? "try" : "tries"} to the Roodogs ·{" "}
            {formatClock(elapsed)} played · fair-time gap{" "}
            {formatClock(fairness.spreadMs)}
          </p>

          <section className="rounded-xl border border-stone-200 bg-white p-3">
            <h2 className="text-sm font-semibold">
              🏅 Player of the match{" "}
              <span className="font-normal text-stone-400">(optional)</span>
            </h2>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {squad
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => {
                  const chosen = match.playerOfMatchId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        saveMatch({
                          ...match,
                          playerOfMatchId: chosen ? undefined : p.id,
                        })
                      }
                      aria-pressed={chosen}
                      className={`min-h-[44px] rounded-full border px-3 text-sm font-medium ${
                        chosen
                          ? "border-amber-500 bg-amber-400 text-amber-950"
                          : "border-stone-300 bg-white text-stone-600"
                      }`}
                    >
                      {chosen ? "🏅 " : ""}
                      {withNo(p)}
                    </button>
                  );
                })}
            </div>
          </section>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Result <span className="font-normal text-stone-400">(optional)</span>
            <input
              defaultValue={match.result ?? ""}
              onBlur={(e) =>
                saveMatch({ ...match, result: e.target.value.trim() })
              }
              placeholder="e.g. Won 5 tries to 3"
              className="min-h-[48px] rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-pitch focus:ring-1 focus:ring-pitch"
            />
          </label>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="py-2 font-semibold">Player</th>
                <th className="py-2 text-right font-semibold">Time</th>
                <th className="py-2 text-right font-semibold">Tries</th>
                <th className="py-2 text-right font-semibold">Tackles</th>
                <th className="py-2 text-right font-semibold">Steals</th>
                <th className="py-2 text-right font-semibold">Lost</th>
              </tr>
            </thead>
            <tbody>
              {squad
                .slice()
                .sort(
                  (a, b) =>
                    (timeById.get(b.id) ?? 0) - (timeById.get(a.id) ?? 0)
                )
                .map((p) => (
                  <tr key={p.id} className="border-b border-stone-100">
                    <td className="py-2 font-medium">{withNo(p)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatClock(timeById.get(p.id) ?? 0)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {countEvents(events, p.id, "try") || "–"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {countEvents(events, p.id, "tackle") || "–"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {countEvents(events, p.id, "steal") || "–"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {countEvents(events, p.id, "lost") || "–"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-20 mx-auto flex w-fit max-w-[90%] items-center gap-3 rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg">
          <span className="truncate">{toast.label}</span>
          <button
            onClick={undoToast}
            className="min-h-[44px] shrink-0 font-bold text-amber-300"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
