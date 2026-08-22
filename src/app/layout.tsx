import type { Metadata } from "next";
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
