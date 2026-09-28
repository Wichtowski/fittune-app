import { describe, expect, it } from "vitest";

import { fillTemplateWeights, formFromTemplate, routineTemplates, templateCategories } from "./templates";
import type { ExerciseHistory } from "@/schemas/exercise";
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

  it("uses the latest normal weights in order without changing prescribed reps", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const form = formFromTemplate(
      { name: "Press", category: "Full body", exercises: [["Press", 4, 8]] },
      [{ id, name: "Press", tracking: "weight_reps" }],
    )!;
    const history = { sessions: [
      { sets: [{ kind: "warmup", weight_kg: 40 }, { kind: "normal", weight_kg: 100 }, { kind: "normal", weight_kg: 102.5 }, { kind: "drop", weight_kg: 80 }] },
      { sets: [{ kind: "normal", weight_kg: 95 }] },
    ] } as ExerciseHistory;
    const histories = new Map([[id, history]]);
    const kg = fillTemplateWeights(form, histories, "kg");
    expect(kg.exercises[0]?.sets.map((set) => set.weight)).toEqual([100, 102.5, 102.5, 102.5]);
    expect(kg.exercises[0]?.sets.map((set) => set.reps)).toEqual([8, 8, 8, 8]);
    expect(fillTemplateWeights(form, histories, "lb").exercises[0]?.sets[0]?.weight).toBe(220.46);
    expect(form.exercises[0]?.sets[0]?.weight).toBe("");
  });

  it("leaves weight blank without history and skips sessions without normal weights", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const form = formFromTemplate(
      { name: "Press", category: "Full body", exercises: [["Press", 2, 6]] },
      [{ id, name: "Press", tracking: "weight_reps" }],
    )!;
    expect(fillTemplateWeights(form, new Map(), "kg").exercises[0]?.sets[0]?.weight).toBe("");
    const history = { sessions: [
      { sets: [{ kind: "warmup", weight_kg: 40 }, { kind: "normal", weight_kg: null }] },
      { sets: [{ kind: "normal", weight_kg: 90 }] },
    ] } as ExerciseHistory;
    expect(fillTemplateWeights(form, new Map([[id, history]]), "kg").exercises[0]?.sets.map((set) => set.weight)).toEqual([90, 90]);
  });
});
