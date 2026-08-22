import "server-only";

import { profile, socialLinks } from "@/content/profile";
import type { Profile, SocialLink } from "@/types/content";

/** Read façade for the profile singleton. See `./projects.ts` for rationale. */

export async function getProfile(): Promise<Profile> {
  return profile;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  return socialLinks
    .filter((link) => link.status === "PUBLISHED")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
