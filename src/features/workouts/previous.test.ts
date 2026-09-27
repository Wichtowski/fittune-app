import { describe, expect, it } from "vitest";

import { setLabels, summariseSet } from "./previous";

const units = { weightUnit: "kg" as const, distanceUnit: "km" as const };
const empty = { reps: null, weight_kg: null, duration_seconds: null, distance_m: null };

describe("previous set helpers", () => {
  it("numbers working sets and marks warm-ups and drops", () => {
    expect(setLabels(["warmup", "normal", "normal", "drop", "failure"])).toEqual(["W", "1", "2", "D", "3"]);
  });

  it("summarises sets per tracking type", () => {
    expect(summariseSet({ ...empty, weight_kg: 102.5, reps: 5 }, "weight_reps", units)).toBe("102.5 × 5");
    expect(summariseSet({ ...empty, reps: 12 }, "weight_reps", units)).toBe("BW × 12");
    expect(summariseSet({ ...empty, reps: 12 }, "reps", units)).toBe("× 12");
    expect(summariseSet({ ...empty, duration_seconds: 90 }, "duration", units)).toBe("1:30");
    expect(summariseSet({ ...empty, distance_m: 5000, duration_seconds: 1500 }, "distance_duration", units)).toBe("5 km · 25:00");
    expect(summariseSet(empty, "weight_reps", units)).toBeNull();
  });

  it("converts to pounds for display", () => {
    expect(summariseSet({ ...empty, weight_kg: 100, reps: 5 }, "weight_reps", { ...units, weightUnit: "lb" })).toBe("220.5 × 5");
  });
});
