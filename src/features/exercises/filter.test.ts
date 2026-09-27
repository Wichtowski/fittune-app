import { describe, expect, it } from "vitest";

import { filterExercises } from "./filter";
import type { Exercise } from "@/schemas/exercise";

function exercise(name: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: name,
    name,
    tracking: "weight_reps",
    primary_muscle: "chest",
    secondary_muscles: [],
    equipment: "barbell",
    difficulty: "beginner",
    video_id: null,
    instructions: null,
    is_custom: false,
    archived_at: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const library = [
  exercise("Barbell Bench Press", { secondary_muscles: ["triceps"] }),
  exercise("Incline Dumbbell Press", { equipment: "dumbbell" }),
  exercise("Triceps Pushdown", { primary_muscle: "triceps", equipment: "cable" }),
];

describe("filterExercises", () => {
  it("matches every search word, with gym shorthand", () => {
    expect(filterExercises(library, { q: "db press" }).map((e) => e.name)).toEqual(["Incline Dumbbell Press"]);
    expect(filterExercises(library, { q: "  PRESS " })).toHaveLength(2);
  });

  it("uses the selected place equipment while keeping bodyweight available", () => {
    const exercises = [...library, exercise("Push-Up", { equipment: "none" })];
    expect(filterExercises(exercises, { availableEquipment: ["dumbbell"] }).map((e) => e.name)).toEqual(["Incline Dumbbell Press", "Push-Up"]);
    expect(filterExercises(exercises, { availableEquipment: [] }).map((e) => e.name)).toEqual(["Push-Up"]);
    expect(filterExercises(exercises, { availableEquipment: undefined })).toHaveLength(4);
    expect(filterExercises(exercises, { availableEquipment: ["dumbbell"], q: "press", muscle: "chest" }).map((e) => e.name)).toEqual(["Incline Dumbbell Press"]);
  });

  it("matches primary or secondary muscle and equipment", () => {
    expect(filterExercises(library, { muscle: "triceps" }).map((e) => e.name)).toEqual([
      "Barbell Bench Press",
      "Triceps Pushdown",
    ]);
    expect(filterExercises(library, { equipment: "cable" })).toHaveLength(1);
  });
});
