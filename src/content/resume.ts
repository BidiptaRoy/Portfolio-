import { resumeVersionSchema } from "@/lib/validation/content";
import type { ResumeVersion } from "@/types/content";

/**
 * The PDF header reads `bidiptar@bu.com`, which earlier notes here called a
 * typo. **It is not** — Bidipta confirmed on 2026-08-24 that it is a valid
 * address of his. Corrected rather than left standing, because a wrong warning
 * is worse than none: it invites someone to "fix" a working address.
 *
 * Worth knowing, though: the site publishes `bidiptar@bu.edu` — in
 * `profile.email` and in both social links — so the resume and the site give
 * **different** addresses. Both reach him, so nothing bounces. Whether a
 * recruiter should see one address or two is a content decision, not a bug,
 * and it is his to make.
 *
 * To pull a revision from the public site without deleting anything, change
 * `status` to "DRAFT". The Resume page then renders without a download link
 * and no other file needs touching — this is exactly what the publish workflow
 * is for.
 */
export const resumeVersions: ResumeVersion[] = [
  {
    label: "Resume — April 2026",
    fileUrl: "/resume/bidipta-roy-resume.pdf",
    downloadName: "Bidipta-Roy-Resume.pdf",
    revisedAt: "2026-04",
    isCurrent: true,
    status: "PUBLISHED",
    sortOrder: 0,
  },
].map((entry) => resumeVersionSchema.parse(entry));
