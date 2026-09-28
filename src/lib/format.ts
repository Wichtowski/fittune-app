import { getLocale, t } from "./i18n";

/** "1:05:09" / "42:10" - for live timers */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 05m", "42m", "1m 30s", "45s" - for summaries. Seconds only matter for short spans */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return "–";
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m >= 10 || (m > 0 && s === 0)) return `${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const formatters = Object.fromEntries((["en", "pl"] as const).map((locale) => [locale, {
  day: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }),
  date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }),
  time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }),
  month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
  shortDate: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
}])) as Record<"en" | "pl", Record<"day" | "date" | "time" | "month" | "shortDate", Intl.DateTimeFormat>>;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Today", "Yesterday", "Mon 21 Sep" (with year when not the current one). */
export function formatDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return t("Today");
  if (days === 1) return t("Yesterday");
  if (date.getFullYear() !== now.getFullYear()) return formatters[getLocale()].date.format(date);
  return formatters[getLocale()].day.format(date);
}

/** How long ago, for "last synced" style labels: "just now", "5 min ago", "3 h ago", then the day */
export function formatAgo(iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t("just now");
  if (minutes < 60) return t("{count} min ago", { count: minutes });
  if (minutes < 24 * 60) return t("{count} h ago", { count: Math.floor(minutes / 60) });
  return formatDay(iso, now);
}

export function formatTime(iso: string): string {
  return formatters[getLocale()].time.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return formatters[getLocale()].date.format(new Date(iso));
}

export function formatShortDate(isoOrDate: string): string {
  // Bare dates ("2026-09-14") are calendar days: parse them as local, not UTC, midnight.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T00:00:00`) : new Date(isoOrDate);
  return formatters[getLocale()].shortDate.format(date);
}

export function formatMonth(iso: string): string {
  return formatters[getLocale()].month.format(new Date(iso));
}

/** Percent change between periods, or null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return t("Late session");
  if (hour < 12) return t("Good morning");
  if (hour < 18) return t("Good afternoon");
  return t("Good evening");
}
