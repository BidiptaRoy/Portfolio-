import type { Education, Profile, SocialLink } from "@/types/content";

/**
 * schema.org Person markup, so search engines can associate the site with a
 * named person rather than inferring it from prose. This is what powers a
 * knowledge panel and helps a search for "Bidipta Roy" surface this site
 * above unrelated results.
 *
 * This is the ONLY sanctioned use of dangerouslySetInnerHTML in the codebase
 * (see CLAUDE.md). It is required because the payload must be raw JSON inside
 * a script tag, not escaped text. The `<` replacement below closes the one
 * real hole: a value containing "</script>" would otherwise break out of the
 * tag. All values are ours today, but that will stop being true the moment
 * this data comes from the CMS in Phase 8.
 */
export function PersonJsonLd({
  profile,
  education,
  socials,
  siteUrl,
}: {
  profile: Profile;
  education: Education[];
  socials: SocialLink[];
  siteUrl: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.headline,
    description: profile.shortBio,
    email: `mailto:${profile.email}`,
    url: siteUrl,
    address: { "@type": "PostalAddress", addressLocality: profile.location },
    alumniOf: education.map((entry) => ({
      "@type": "CollegeOrUniversity",
      name: entry.institution,
    })),
    sameAs: socials.filter((social) => social.platform !== "EMAIL").map((social) => social.url),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
