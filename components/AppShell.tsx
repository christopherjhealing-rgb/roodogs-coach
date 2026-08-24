"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The board editor gets the whole viewport (landscape pitch on wide
  // screens); everything else stays a comfortable phone-width column.
  const isBoardEditor = /^\/board\/[^/]+/.test(pathname);

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full flex-col ${
        isBoardEditor ? "" : "max-w-md"
      }`}
    >
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
