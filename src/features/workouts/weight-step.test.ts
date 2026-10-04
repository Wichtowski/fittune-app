import { describe, expect, it } from "vitest";

import { getWeightStep, setWeightStep, stepValue } from "./weight-step";

describe("weight step", () => {
  it("defaults to the smallest common pair of plates and remembers a choice per unit", () => {
    expect(getWeightStep("kg")).toBe(2.5);
    expect(getWeightStep("lb")).toBe(5);

    setWeightStep("kg", 1.25);
    expect(getWeightStep("kg")).toBe(1.25);
    expect(getWeightStep("lb")).toBe(5);

    setWeightStep("kg", 3);
    expect(getWeightStep("kg")).toBe(1.25);
    setWeightStep("kg", 2.5);
  });

  it("steps from an empty field, stays in range and leaves no floating point dust", () => {
    expect(stepValue(null, 2.5, 2500)).toBe(2.5);
    expect(stepValue(null, -2.5, 2500)).toBe(0);
    expect(stepValue(1, -2.5, 2500)).toBe(0);
    expect(stepValue(2499, 2.5, 2500)).toBe(2500);
    expect(stepValue(0.1, 0.2, 2500)).toBe(0.3);
    expect(stepValue(61.25, 1.25, 2500)).toBe(62.5);
  });
});
