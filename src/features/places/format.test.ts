import { describe, expect, it } from "vitest";

import { equipmentSummary, requirementSummary } from "./format";

describe("equipment summaries", () => {
  it("always includes bodyweight and shortens long lists", () => {
    expect(equipmentSummary({ equipment: [] })).toBe("Bodyweight");
    expect(equipmentSummary({ equipment: ["barbell", "flat_bench", "squat_rack"] }, 2)).toBe("Bodyweight · Barbell · Flat bench +1 more");
  });

  it("describes what an exercise needs", () => {
    expect(requirementSummary(["barbell", "squat_rack"])).toBe("Barbell · Squat rack");
    expect(requirementSummary([])).toBe("No equipment");
  });
});
