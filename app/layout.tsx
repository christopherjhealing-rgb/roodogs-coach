import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";
import PasswordGate from "@/components/PasswordGate";
import SyncProvider from "@/components/SyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roodogs Coach",
  description: "Coaching companion for the Wanneroo Roodogs Under 9s",
  manifest: "/manifest.webmanifest",
  // Without this the page declared no icon, so desktop browser tabs showed
  // none and fell back to requesting /favicon.ico (now also present).
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
  width: "device-width",
  initialScale: 1,
  // Lets the bottom nav's env(safe-area-inset-bottom) padding take effect
  // on phones with a home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body className="min-h-dvh bg-stone-100 text-stone-900 antialiased">
        <PasswordGate>
          <SyncProvider>
            <AppShell>{children}</AppShell>
          </SyncProvider>
        </PasswordGate>
      </body>
    </html>
  );
}
