import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";

import "./globals.css";

// Both are variable fonts, so a single file covers every weight — no separate
// request per weight, and no layout shift because next/font self-hosts them.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

// Declared explicitly rather than relying on the framework default, and
// deliberately WITHOUT `viewportFit: "cover"`: with the default, iOS keeps
// content clear of the notch and home indicator automatically. Opting into
// edge-to-edge would mean handling every safe-area inset by hand for no gain
// on a layout that has no fixed or full-bleed chrome.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Not `maximumScale: 1` — capping zoom breaks pinch-to-zoom for anyone who
  // needs it, and iOS ignores it anyway. Never add it.
};

// Full metadata, Open Graph images, and JSON-LD are Phase 5 — see docs/roadmap.md.
export const metadata: Metadata = {
  title: "Bidipta Roy",
  description: "Software engineer and Computer Science student at Boston University.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SkipLink />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
