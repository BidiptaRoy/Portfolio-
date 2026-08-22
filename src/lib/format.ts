import type { YearMonth } from "@/types/content";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * "2025-11" → "Nov 2025", "2025" → "2025".
 *
 * Formatted by hand rather than with `Date` or `Intl`: constructing a Date
 * from "2025-11" parses it as UTC midnight, which in a negative timezone
 * rolls back to October. Month-precision values are not instants, and
 * treating them as such is how off-by-one-month date bugs happen.
 */
export function formatYearMonth(value: YearMonth): string {
  const [year, month] = value.split("-");
  if (!year) return value;
  if (!month) return year;

  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : year;
}

/** "Sep 2025 — Present" or "Sep 2021 — Aug 2023". */
export function formatDateRange(
  startDate: YearMonth,
  endDate: YearMonth | null,
  current: boolean,
): string {
  const start = formatYearMonth(startDate);
  if (current || !endDate) return `${start} — Present`;

  const end = formatYearMonth(endDate);
  return start === end ? start : `${start} — ${end}`;
}
