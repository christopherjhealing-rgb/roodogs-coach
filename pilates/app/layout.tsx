import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import DataProvider from "@/components/DataProvider";
import AppShell from "@/components/AppShell";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bloom Pilates",
  description: "Movement library, lesson plans and class calendar for Bloom instructors",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1F3B2E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={poppins.variable}>
      <body
        className="min-h-dvh antialiased"
        style={{ ["--font-body" as string]: "var(--font-display)" }}
      >
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  );
}
