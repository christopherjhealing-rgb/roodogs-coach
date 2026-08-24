"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "./NavIcon";

// Soft shared-team gate. There's no server, so this only keeps casual
// visitors out — the password necessarily ships in the app. Change it here.
const PASSWORD = "wanneroo10";
const KEY = "roodogs.unlocked";

export default function PasswordGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setUnlocked(true);
    } catch {
      // storage blocked — the gate just shows each visit
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-pitch-dark px-6 text-center text-white">
      <LogoMark className="h-16 w-16" />
      <div>
        <h1 className="text-2xl font-bold">Roodogs Coach</h1>
        <p className="pt-1 text-sm text-emerald-100">
          Enter the team password to continue.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (entry === PASSWORD) {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              // ignore — still unlock for this visit
            }
            setUnlocked(true);
          } else {
            setError(true);
          }
        }}
        className="flex w-full max-w-xs flex-col gap-2"
      >
        <input
          type="password"
          value={entry}
          onChange={(e) => {
            setEntry(e.target.value);
            setError(false);
          }}
          autoFocus
          placeholder="Password"
          aria-label="Team password"
          className="min-h-[48px] rounded-lg px-3 text-center text-base text-stone-900 outline-none"
        />
        {error && (
          <p className="text-sm font-medium text-rose-300">
            That&apos;s not it — try again.
          </p>
        )}
        <button
          type="submit"
          className="min-h-[48px] rounded-lg bg-white font-bold text-pitch"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
