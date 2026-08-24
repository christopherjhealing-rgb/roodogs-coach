"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark, NavIcon } from "./NavIcon";
import { TABS } from "./navTabs";

/** Desktop-only left rail. Hidden on mobile, where BottomNav takes over. */
export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-5 md:flex">
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <LogoMark className="h-9 w-9 shrink-0" />
        <span className="text-lg font-bold leading-tight text-pitch">
          Roodogs
          <br />
          Coach
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {TABS.map((tab) => {
          const current = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 text-sm font-semibold ${
                current
                  ? "bg-pitch text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <NavIcon name={tab.icon} className="h-5 w-5 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
