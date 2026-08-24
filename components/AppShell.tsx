"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The board editor gets the whole content area (landscape pitch on wide
  // screens); every other page is centred at a comfortable reading width.
  const isBoardEditor = /^\/board\/[^/]+/.test(pathname);

  return (
    <div className="min-h-dvh md:flex">
      <SideNav />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <main
          className={`flex-1 pb-24 md:pb-8 ${
            isBoardEditor ? "" : "mx-auto w-full max-w-6xl"
          }`}
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
