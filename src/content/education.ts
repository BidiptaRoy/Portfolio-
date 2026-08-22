import { educationSchema } from "@/lib/validation/content";
import type { Education } from "@/types/content";

/**
 * TODO — confirm whether the degree is a B.A. or a B.S. before launch.
 * "Bachelor's degree" is accurate either way, which is why it is phrased
 * that way rather than guessed.
 */
export const education: Education[] = [
  {
    slug: "boston-university-cs",
    institution: "Boston University",
    degree: "Bachelor's degree",
    field: "Computer Science",
    location: "Boston, MA",
    startDate: "2023-09",
    endDate: "2027-05",
    expected: true,
    highlights: [],
  },
].map((entry, index) => educationSchema.parse({ ...entry, status: "PUBLISHED", sortOrder: index }));
