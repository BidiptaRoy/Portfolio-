import { ImageResponse } from "next/og";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — Software Engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The social card shown when a link to the site is shared.
 *
 * Rendered by Satori, which is not a browser: it supports a subset of CSS
 * (flexbox only — no grid, no float), needs explicit `display: flex` on any
 * element with multiple children, and has no access to the site's Tailwind
 * classes or CSS custom properties. The Editorial Oat palette is therefore
 * repeated here as literal values; if the tokens in globals.css change, this
 * file must be updated by hand. That duplication is the price of the format.
 *
 * No custom font is loaded. Satori only has the typefaces it is given, so
 * naming Fraunces would silently fall back to the default anyway — and
 * loading the file would add a build-time read for a marginal gain.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#f5f0e8",
        padding: 80,
      }}
    >
      {/* Eyebrow — the same leading-rule motif the site uses. */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 56, height: 2, backgroundColor: "#cfc2ae" }} />
        <div
          style={{
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#6b5d4f",
          }}
        >
          Portfolio
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 104, color: "#2b2119", lineHeight: 1.05 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 34, color: "#6b5d4f", lineHeight: 1.35 }}>{SITE_TAGLINE}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 120, height: 6, backgroundColor: "#7a4e2d" }} />
        <div style={{ fontSize: 24, color: "#6b5d4f" }}>Projects · Experience · Resume</div>
      </div>
    </div>,
    size,
  );
}
