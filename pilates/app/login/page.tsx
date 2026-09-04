"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BloomMark from "@/components/BloomMark";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

type Mode = "signin" | "signup" | "magic";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/plans";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <Frame>
        <p className="text-ink/80 mb-4">
          Accounts are not set up yet, so this app is running in <strong>this device only</strong> mode.
          Your data stays in this browser.
        </p>
        <button className="btn-dark w-full" onClick={() => router.replace("/plans")}>
          Continue
        </button>
      </Frame>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo, data: { display_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setMessage("Check your email for a confirmation link, then come back and sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setMessage("Magic link sent. Open it on this device to sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame>
      <div className="flex gap-1 mb-5 rounded-full bg-mint-soft p-1">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
            ["magic", "Magic link"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
              mode === m ? "bg-forest-deep text-mint" : "text-ink/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">First name</label>
            <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email*</label>
          <input
            id="email"
            type="email"
            required
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />
        </div>
        {mode !== "magic" && (
          <div>
            <label className="label" htmlFor="password">Password*</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        )}
        {error && <p className="text-sm text-red-800 bg-red-100 rounded-xl px-3 py-2">{error}</p>}
        {message && <p className="text-sm text-ink bg-mint-soft rounded-xl px-3 py-2">{message}</p>}
        <button type="submit" disabled={busy} className="btn-dark w-full">
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send magic link"}
        </button>
      </form>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <BloomMark className="w-14 h-14 mb-6" />
        <h1 className="display text-5xl md:text-6xl">
          Something is
          <br />
          <em className="italic">blooming</em>
          <br />
          on the mat
        </h1>
        <p className="mt-4 text-mint/80">Movement library, lesson plans and your class calendar.</p>
      </div>
      <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="card mx-auto max-w-md">{children}</div>
      </div>
    </div>
  );
}
