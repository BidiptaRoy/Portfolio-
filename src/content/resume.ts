import { resumeVersionSchema } from "@/lib/validation/content";
import type { ResumeVersion } from "@/types/content";

/**
 * ⚠ THE CURRENT FILE CONTAINS A TYPO IN THE CONTACT EMAIL.
 *
 * The PDF header reads `bidiptar@bu.com`; the correct address is
 * `bidiptar@bu.edu`. Anyone who downloads this and replies to the address on
 * it will have their message bounce, silently. Bidipta is aware and is
 * preparing a corrected version; this is published as a placeholder in the
 * meantime at his request.
 *
 * To pull it from the public site without deleting anything, change `status`
 * to "DRAFT". The Resume page then renders without a download link, and no
 * other file needs touching — this is exactly what the publish workflow is
 * for. Replace the PDF in public/resume/ and flip it back when corrected.
 */
export const resumeVersions: ResumeVersion[] = [
  {
    label: "Resume — April 2026",
    fileUrl: "/resume/bidipta-roy-resume.pdf",
    downloadName: "Bidipta-Roy-Resume.pdf",
    updatedAt: "2026-04",
    isCurrent: true,
    status: "PUBLISHED",
    sortOrder: 0,
  },
].map((entry) => resumeVersionSchema.parse(entry));
