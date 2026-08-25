import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { getSiteUrl, SITE_NAME } from "@/lib/site";

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

const siteUrl = getSiteUrl();

const description =
  "Computer Science student at Boston University building full-stack applications — projects, experience, and how I approach engineering.";

export const metadata: Metadata = {
  // Required for Open Graph images and canonical links to resolve to absolute
  // URLs. Without it, relative metadata URLs are emitted as-is and social
  // previews break.
  metadataBase: new URL(siteUrl),

  // Pages set a short `title`; the template appends the site name, so no page
  // has to repeat it and the suffix can never drift between pages.
  title: {
    default: `${SITE_NAME} — Software Engineer`,
    template: `%s · ${SITE_NAME}`,
  },
  description,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Software Engineer`,
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Software Engineer`,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

/**
 * Analytics runs ONLY on Vercel, and the check is not defensive clutter.
 *
 * Both packages load their script from a same-origin `/_vercel/…` path that
 * only Vercel's edge proxies — which is exactly why they need no CSP change
 * (see docs/decisions/0014). Off Vercel that path does not exist:
 *
 *   - in `next dev`, the packages fall back to an OFF-ORIGIN debug script at
 *     va.vercel-scripts.com, which this site's CSP correctly refuses. That
 *     would put a permanent, meaningless violation in the console of the one
 *     environment where a real violation most needs to stand out.
 *   - under `npm start` and in the e2e suite, the script simply 404s.
 *
 * Neither collects anything useful, so neither is worth rendering.
 */
const analyticsEnabled = process.env.VERCEL === "1";

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

        {analyticsEnabled ? (
          <>
            {/* Page views. Cookieless and no cross-site identifier, which is
                why this needs no consent banner — see docs/decisions/0014. */}
            <Analytics />
            {/* Core Web Vitals from real visitors, rather than from one
                Lighthouse run on one laptop on one connection. */}
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
