import { describe, expect, it } from "vitest";

import { formatDistance, formatPace, formatSpeed, formatVolume, formatWeight, kgTo, toKg } from "./units";

describe("units", () => {
  it("round-trips weights through pounds", () => {
    expect(toKg("lb", kgTo("lb", 102.5))).toBeCloseTo(102.5, 10);
    expect(formatWeight(100, "lb")).toBe("220.5 lb");
    expect(formatWeight(null, "kg")).toBe("–");
  });

  it("compacts large volumes", () => {
    expect(formatVolume(9_500, "kg")).toBe(`${(9500).toLocaleString()} kg`);
    expect(formatVolume(18_250, "kg")).toBe("18.3k kg");
  });

  it("formats distance, pace and speed", () => {
    expect(formatDistance(5000, "km")).toBe("5.00 km");
    expect(formatPace(1500, 5000, "km")).toBe("5:00 /km");
    expect(formatPace(1799, 5000, "km")).toBe("6:00 /km");
    expect(formatSpeed(3600, 30_000, "km")).toBe("30.0 km/h");
    expect(formatPace(600, null, "km")).toBeNull();
  });
});
