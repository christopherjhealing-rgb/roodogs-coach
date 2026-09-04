import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Exchanges the code from a magic link / confirmation email for a session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/plans";
  const safeNext = next.startsWith("/") ? next : "/plans";

  if (code) {
    const supabase = await getServerSupabase();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
