import { describe, expect, it } from "vitest";

import { formFromTemplate, routineTemplates, templateCategories } from "./templates";
import { routineFormSchema } from "@/schemas/routine";

describe("routine templates", () => {
  it("covers each category with distinct, usable sessions", () => {
    expect(routineTemplates.length).toBeGreaterThanOrEqual(50);
    expect(new Set(routineTemplates.map((template) => template.name)).size).toBe(routineTemplates.length);
    for (const category of templateCategories) expect(routineTemplates.some((template) => template.category === category)).toBe(true);
    for (const template of routineTemplates) {
      expect(template.exercises.length).toBeGreaterThanOrEqual(3);
      expect(new Set(template.exercises.map(([name]) => name)).size).toBe(template.exercises.length);
      for (const [, sets, target, rest] of template.exercises) {
        expect(sets).toBeGreaterThan(0);
        expect(target).toBeGreaterThan(0);
        if (rest !== undefined) expect(rest).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("fills targets by tracking type and rejects missing exercises", () => {
    const template = { name: "Test", category: "Full body" as const, exercises: [["Press", 3, 8], ["Plank", 2, 45], ["Run", 1, 300]] as const };
    const catalog = [
      { id: "00000000-0000-4000-8000-000000000001", name: "Press", tracking: "weight_reps" as const },
      { id: "00000000-0000-4000-8000-000000000002", name: "Plank", tracking: "duration" as const },
      { id: "00000000-0000-4000-8000-000000000003", name: "Run", tracking: "distance_duration" as const },
    ];
    expect(formFromTemplate(template, catalog.slice(0, 2))).toBeNull();
    const form = formFromTemplate(template, catalog);
    expect(routineFormSchema.safeParse(form).success).toBe(true);
    expect(form?.exercises[0]?.sets).toHaveLength(3);
    expect(form?.exercises[0]?.sets[0]).toMatchObject({ reps: 8, weight: "", duration_seconds: "" });
    expect(form?.exercises[1]?.sets[0]).toMatchObject({ reps: "", duration_seconds: 45 });
    expect(form?.exercises[2]?.sets[0]).toMatchObject({ reps: "", duration_seconds: 300 });
  });
});
