"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  countEvents,
  finalWhistleMs,
  formatMins,
  playerGameTimeMs,
} from "@/lib/gameTime";
import { storage } from "@/lib/storage";

interface PlayerSeason {
  id: string;
  name: string;
  games: number;
  timeMs: number;
  tries: number;
  tackles: number;
  steals: number;
  lost: number;
  trainings: number;
  potm: number;
}

interface Badge {
  emoji: string;
  label: string;
}

/** Positive-only season milestones. */
function badgesFor(
  r: PlayerSeason,
  totalMatches: number,
  totalRolledSessions: number
): Badge[] {
  const badges: Badge[] = [];
  if (r.potm > 0)
    badges.push({
      emoji: "🏅",
      label: r.potm === 1 ? "Player of the match" : `Player of the match ×${r.potm}`,
    });
  if (r.tries > 0) badges.push({ emoji: "🎉", label: "Try scorer" });
  if (r.tackles >= 10) badges.push({ emoji: "💪", label: "10+ tackles" });
  if (totalMatches >= 3 && r.games === totalMatches)
    badges.push({ emoji: "⭐", label: "Played every match" });
  if (totalRolledSessions >= 3 && r.trainings === totalRolledSessions)
    badges.push({ emoji: "🎒", label: "Never missed training" });
  return badges;
}

export default function StatsPage() {
  const [rows, setRows] = useState<PlayerSeason[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [rolledSessions, setRolledSessions] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const players = storage.getPlayers();
    const finished = storage
      .getMatches()
      .filter((m) => m.status === "finished");
    const allEvents = storage.getMatchEvents();
    // only sessions where a roll was actually taken count for attendance
    const rolled = storage
      .getSessions()
      .filter((s) => (s.attendeeIds ?? []).length > 0);

    const totals = new Map<string, PlayerSeason>(
      players.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          games: 0,
          timeMs: 0,
          tries: 0,
          tackles: 0,
          steals: 0,
          lost: 0,
          trainings: 0,
          potm: 0,
        },
      ])
    );

    for (const match of finished) {
      const events = allEvents.filter((e) => e.matchId === match.id);
      const whistle = finalWhistleMs(match.clockPeriods ?? []);
      for (const row of totals.values()) {
        const t = playerGameTimeMs(
          row.id,
          events,
          match.clockPeriods ?? [],
          whistle
        );
        if (t > 0) {
          row.games += 1;
          row.timeMs += t;
        }
        row.tries += countEvents(events, row.id, "try");
        row.tackles += countEvents(events, row.id, "tackle");
        row.steals += countEvents(events, row.id, "steal");
        row.lost += countEvents(events, row.id, "lost");
        if (match.playerOfMatchId === row.id) row.potm += 1;
      }
    }
    for (const session of rolled) {
      for (const id of session.attendeeIds ?? []) {
        const row = totals.get(id);
        if (row) row.trainings += 1;
      }
    }

    setRows(
      [...totals.values()]
        .filter((r) => r.games > 0 || r.trainings > 0)
        .sort((a, b) => b.timeMs - a.timeMs)
    );
    setMatchCount(finished.length);
    setRolledSessions(rolled.length);
    setLoaded(true);
  }, []);

  const topTries = rows.reduce(
    (best, r) => (r.tries > (best?.tries ?? 0) ? r : best),
    null as PlayerSeason | null
  );
  const topTackles = rows.reduce(
    (best, r) => (r.tackles > (best?.tackles ?? 0) ? r : best),
    null as PlayerSeason | null
  );

  const highlights = rows
    .map((r) => ({ row: r, badges: badgesFor(r, matchCount, rolledSessions) }))
    .filter((h) => h.badges.length > 0)
    .sort((a, b) => b.badges.length - a.badges.length);

  async function exportCsv() {
    const header = "Player,Games,Minutes,Tries,Tackles,Steals,BallsLost,Trainings\n";
    const body = rows
      .map(
        (r) =>
          `"${r.name.replace(/"/g, '""')}",${r.games},${Math.round(
            r.timeMs / 60000
          )},${r.tries},${r.tackles},${r.steals},${r.lost},${r.trainings}`
      )
      .join("\n");
    const blob = new Blob([header + body + "\n"], { type: "text/csv" });
    const file = new File([blob], "roodogs-season-stats.csv", {
      type: "text/csv",
    });
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Roodogs season stats" });
        return;
      } catch {
        // cancelled — fall through to download
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-4">
      <header className="flex items-end justify-between gap-2">
        <div>
          <Link href="/match" className="min-h-[44px] py-2 text-sm text-stone-500">
            ‹ Matches
          </Link>
          <h1 className="text-2xl font-bold">Season stats</h1>
          {loaded && (
            <p className="text-sm text-stone-500">
              {matchCount} {matchCount === 1 ? "match" : "matches"} ·{" "}
              {rolledSessions}{" "}
              {rolledSessions === 1 ? "training" : "trainings"} with the roll
              taken
            </p>
          )}
        </div>
        {rows.length > 0 && (
          <button
            onClick={exportCsv}
            className="min-h-[44px] shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-600"
          >
            ⤴ CSV
          </button>
        )}
      </header>

      {loaded && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <span className="text-4xl" aria-hidden>
            🏆
          </span>
          <p className="font-semibold">The season starts here</p>
          <p className="text-sm text-stone-500">
            Finish your first match and every Roodog&apos;s minutes, tries and
            tackles will show up on this page.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {topTries && topTries.tries > 0 && (
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-900">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  Top try scorer
                </div>
                <div className="text-lg font-bold">{topTries.name}</div>
                <div className="text-sm">
                  {topTries.tries} {topTries.tries === 1 ? "try" : "tries"}
                </div>
              </div>
            )}
            {topTackles && topTackles.tackles > 0 && (
              <div className="rounded-xl bg-sky-100 p-3 text-sky-900">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  Tackle machine
                </div>
                <div className="text-lg font-bold">{topTackles.name}</div>
                <div className="text-sm">{topTackles.tackles} tackles</div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                  <th className="py-2 font-semibold">Player</th>
                  <th className="py-2 text-right font-semibold">Games</th>
                  <th className="py-2 text-right font-semibold">Time</th>
                  <th className="py-2 text-right font-semibold">Tries</th>
                  <th className="py-2 text-right font-semibold">Tackles</th>
                  <th className="py-2 text-right font-semibold">Steals</th>
                  <th className="py-2 text-right font-semibold">Lost</th>
                  <th className="py-2 text-right font-semibold">Training</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-right tabular-nums">{r.games}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMins(r.timeMs)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.tries || "–"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.tackles || "–"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.steals || "–"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.lost || "–"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.trainings || "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {highlights.length > 0 && (
            <section className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="mb-2 font-semibold">Season highlights</h2>
              <ul className="flex flex-col gap-2">
                {highlights.map(({ row, badges }) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-1.5">
                    <span className="min-w-20 font-medium">{row.name}</span>
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"
                      >
                        {b.emoji} {b.label}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-stone-400">
            Game time is added up from every sub across finished matches —
            handy proof that everyone&apos;s getting a fair run.
          </p>
        </>
      )}
    </div>
  );
}
