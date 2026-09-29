import { describe, expect, it } from "vitest";

import { formatAmount, progress, scale } from "./nutrition";

const oats = { energy_kcal: 372, protein_g: 13, fat_g: 7, carbs_g: 60, saturated_fat_g: 1.2, sugars_g: null, fiber_g: 10, salt_g: null };

describe("scale", () => {
  it("scales per-100 g values to the amount eaten", () => {
    expect(scale(oats, 50)).toMatchObject({ energy_kcal: 186, protein_g: 6.5, fat_g: 3.5, carbs_g: 30, fiber_g: 5, sugars_g: 0 });
  });

  it("is zero for no amount", () => {
    expect(scale(oats, 0).energy_kcal).toBe(0);
  });
});

describe("progress", () => {
  it("is the share of the target eaten, capped for the bar", () => {
    expect(progress(500, 2000)).toEqual({ ratio: 0.25, left: 1500, over: false });
    expect(progress(2400, 2000)).toEqual({ ratio: 1, left: -400, over: true });
  });

  it("distinguishes a zero target from a missing target", () => {
    expect(progress(0, 0)).toEqual({ ratio: 0, left: 0, over: false });
    expect(progress(5, 0)).toEqual({ ratio: 1, left: -5, over: true });
  });

  it("has nothing to show without a target", () => {
    expect(progress(500, undefined)).toEqual({ ratio: 0, left: null, over: false });
  });
});

describe("formatAmount", () => {
  it("rounds calories to whole numbers and grams to one decimal below 10", () => {
    expect(formatAmount(186.4, "kcal")).toBe("186");
    expect(formatAmount(6.54, "g")).toBe("6.5");
    expect(formatAmount(30.4, "g")).toBe("30");
  });
});
