import { assertUniqueSlugs, educationSchema } from "@/lib/validation/content";
import type { Education } from "@/types/content";

export const education: Education[] = [
  {
    slug: "boston-university-cs",
    institution: "Boston University",
    degree: "B.S.",
    field: "Computer Science, Minor in Entrepreneurship",
    location: "Boston, MA",
    startDate: "2023-09",
    endDate: "2027-05",
    expected: true,
    highlights: [
      "Coursework: Data Structures & Algorithms, Databases, Computer Systems & Programming, Combinatorics, Object-Oriented Programming, Web Development",
    ],
  },
].map((entry, index) => educationSchema.parse({ ...entry, status: "PUBLISHED", sortOrder: index }));

assertUniqueSlugs(education, "education");
