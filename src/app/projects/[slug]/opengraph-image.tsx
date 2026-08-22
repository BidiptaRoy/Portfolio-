import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site";
import { getProjectBySlug, getProjectSlugs } from "@/server/queries/projects";

export const alt = "Project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Prerender a card per project so sharing a project link never renders one on demand. */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * Per-project social card. Sharing a link to a specific project is the most
 * likely way this site gets posted — on LinkedIn, in an application, in a
 * message — so those links get a card naming the project rather than the
 * generic site card.
 *
 * See the root opengraph-image for why the palette is duplicated as literals
 * and no custom font is loaded.
 */
export default async function ProjectOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  const title = project?.title ?? SITE_NAME;
  const summary = project?.summary ?? "";
  const tech = project?.tech.slice(0, 5) ?? [];

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
          {SITE_NAME}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 88, color: "#2b2119", lineHeight: 1.05 }}>{title}</div>
        {summary ? (
          <div style={{ fontSize: 30, color: "#6b5d4f", lineHeight: 1.35 }}>{summary}</div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {tech.map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              fontSize: 22,
              color: "#6b5d4f",
              border: "2px solid #cfc2ae",
              borderRadius: 6,
              padding: "8px 16px",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
