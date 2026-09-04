"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "./navTabs";
import NavIcon from "./NavIcon";
import { useData } from "./DataProvider";
import BloomMark from "./BloomMark";

const BARE_ROUTES = ["/login", "/auth"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, cloud, user } = useData();
  const bare = BARE_ROUTES.some((r) => pathname.startsWith(r));

  if (bare) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-mint/80">
          <BloomMark className="w-12 h-12" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // The proxy already redirects signed-out visitors; this covers the client
  // side after a sign-out or an expired session.
  if (cloud && !user) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div>
          <p className="mb-4">You are signed out.</p>
          <Link href="/login" className="btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh md:flex">
      <SideNav pathname={pathname} />
      <main className="flex-1 min-w-0 pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-8">
        <div className="mx-auto max-w-3xl px-4 pt-4 md:px-8 md:pt-8">{children}</div>
      </main>
      <BottomNav pathname={pathname} />
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-forest-deep/95 backdrop-blur border-t border-forest-line pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {NAV_TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[64px] text-[11px] font-medium ${
                  active ? "text-mint" : "text-mint/55"
                }`}
              >
                <span className={`rounded-full px-4 py-1 ${active ? "bg-mint/15" : ""}`}>
                  <NavIcon icon={t.icon} />
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden md:flex md:flex-col w-56 shrink-0 border-r border-forest-line bg-forest-deep px-4 py-6 sticky top-0 h-dvh">
      <Link href="/plans" className="flex items-center gap-2 px-2 mb-8">
        <BloomMark className="w-8 h-8" />
        <span className="display text-xl">Bloom</span>
      </Link>
      <ul className="space-y-1">
        {NAV_TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-3 font-medium ${
                  active ? "bg-mint text-forest-deep" : "text-mint/75 hover:bg-mint/10"
                }`}
              >
                <NavIcon icon={t.icon} className="w-5 h-5" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto px-2 text-xs text-mint/40">Bloom Pilates</p>
    </aside>
  );
}
