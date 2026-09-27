import type { Period } from "@/schemas/stats";

/** The user's IANA time zone, sent to stats endpoints so weeks follow the local calendar. */
export const timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -day);
}

export function currentWeek(now = new Date()): Period {
  const start = startOfWeek(now);
  return { from: toDateString(start), to: toDateString(addDays(start, 6)) };
}

export const RANGES = {
  "4w": { label: "4 weeks", weeks: 4, bucket: "week" },
  "12w": { label: "12 weeks", weeks: 12, bucket: "week" },
  "6m": { label: "6 months", weeks: 26, bucket: "week" },
  "1y": { label: "1 year", weeks: 52, bucket: "month" },
} as const;
export type RangeKey = keyof typeof RANGES;

/** Whole weeks ending with the current one, so period comparisons line up week by week. */
export function rangePeriod(range: RangeKey, now = new Date()): Period {
  const end = addDays(startOfWeek(now), 6);
  const start = addDays(startOfWeek(now), -7 * (RANGES[range].weeks - 1));
  return { from: toDateString(start), to: toDateString(end) };
}

/** `datetime-local` input value for a Date, in local time. */
export function toDateTimeLocal(date: Date): string {
  return `${toDateString(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
