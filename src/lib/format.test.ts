import { describe, expect, it } from "vitest";

import { formatAgo, formatClock, formatDay, formatDuration, percentChange } from "./format";
import { rangePeriod, startOfWeek, toDateString } from "./dates";

describe("formatting", () => {
  it("formats timers and durations", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatDuration(3900)).toBe("1h 05m");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(725)).toBe("12m");
  });

  it("describes recent days relatively", () => {
    const now = new Date(2026, 8, 27, 12);
    expect(formatDay(new Date(2026, 8, 27, 8).toISOString(), now)).toBe("Today");
    expect(formatDay(new Date(2026, 8, 26, 22).toISOString(), now)).toBe("Yesterday");
  });

  it("says how long ago something happened", () => {
    const now = new Date("2026-09-28T12:00:00");
    expect(formatAgo("2026-09-28T11:59:40", now)).toBe("just now");
    expect(formatAgo("2026-09-28T11:55:00", now)).toBe("5 min ago");
    expect(formatAgo("2026-09-28T09:00:00", now)).toBe("3 h ago");
    expect(formatAgo("2026-09-27T09:00:00", now)).toBe("Yesterday");
  });

  it("computes period-over-period change", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(5, 0)).toBeNull();
  });
});

describe("dates", () => {
  it("uses Monday-based weeks", () => {
    expect(toDateString(startOfWeek(new Date(2026, 8, 27)))).toBe("2026-09-21");
  });

  it("builds whole-week ranges ending this week", () => {
    expect(rangePeriod("4w", new Date(2026, 8, 27))).toEqual({ from: "2026-08-31", to: "2026-09-27" });
  });
});
