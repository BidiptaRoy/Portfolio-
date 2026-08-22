import { profileSchema } from "@/lib/validation/content";
import type { Profile, SocialLink } from "@/types/content";

/**
 * Singleton profile. Source of the hero, About copy, and meta description.
 *
 * Content is derived from Bidipta's previous site, corrected where it had
 * gone stale (he is now entering his final year, not a junior) and where it
 * disagreed with him (Computer Science, not CS & Business).
 *
 * The phone number that appeared on the previous site is deliberately absent:
 * a number in public HTML is harvested by scrapers and cannot be retracted
 * once indexed. Email and LinkedIn are sufficient.
 */
export const profile: Profile = profileSchema.parse({
  name: "Bidipta Roy",
  headline: "Software engineer",
  shortBio:
    "Computer Science student at Boston University, building full-stack applications that stay maintainable long after the first release.",
  longBio: [
    "I am a Computer Science student at Boston University, entering my final year. I grew up in Malverne, New York, raised by Bangladeshi immigrant parents — an upbringing that gave me the work ethic and curiosity behind most of what I build.",
    "My interests run through full-stack web development, data-driven interfaces, and product engineering. I like building things from scratch and actually shipping them, whether that is a Jiu Jitsu training app used by classmates or a GIS platform put together over a hackathon weekend.",
    "I am currently a UI/UX design intern at BU Hack4Impact, where I work on web projects for nonprofit organizations. Away from the keyboard I train Brazilian Jiu Jitsu several days a week, lift, run, and will always say yes to exploring a new city or a good restaurant.",
  ],
  location: "Boston, MA",
  email: "bidiptar@bu.edu",
  availability: "Open to software engineering internships",
});

export const socialLinks: SocialLink[] = [
  {
    platform: "GITHUB",
    label: "GitHub",
    url: "https://github.com/BidiptaRoy",
    status: "PUBLISHED",
    sortOrder: 1,
  },
  {
    platform: "LINKEDIN",
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/bidipta-roy",
    status: "PUBLISHED",
    sortOrder: 2,
  },
  {
    platform: "EMAIL",
    label: "bidiptar@bu.edu",
    url: "mailto:bidiptar@bu.edu",
    status: "PUBLISHED",
    sortOrder: 3,
  },
];
