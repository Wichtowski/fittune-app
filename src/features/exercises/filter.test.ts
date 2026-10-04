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
    requires: [],
    difficulty: "beginner",
    video_id: null,
    instructions: null,
    instructions_pl: null,
    is_custom: false,
    archived_at: null,
    created_at: "",
    updated_at: "",
    media: [],
    ...overrides,
  };
}

const library = [
  exercise("Barbell Bench Press", { secondary_muscles: ["triceps"], requires: ["barbell", "flat_bench", "squat_rack"] }),
  exercise("Incline Dumbbell Press", { equipment: "dumbbell", requires: ["dumbbells", "adjustable_bench"] }),
  exercise("Triceps Pushdown", { primary_muscle: "triceps", equipment: "cable", requires: ["cable_station"] }),
];

describe("filterExercises", () => {
  it("matches every search word, with gym shorthand", () => {
    expect(filterExercises(library, { q: "db press" }).map((e) => e.name)).toEqual(["Incline Dumbbell Press"]);
    expect(filterExercises(library, { q: "  PRESS " })).toHaveLength(2);
  });

  it("shows only exercises whose required equipment is all at the place", () => {
    const exercises = [...library, exercise("Push-Up", { equipment: "none" }), exercise("Pull-Up", { equipment: "none", requires: ["pull_up_bar"] })];
    const names = (available: Parameters<typeof filterExercises>[1]["availableEquipment"]) =>
      filterExercises(exercises, { availableEquipment: available }).map((e) => e.name);
    // A barbell alone is not enough for the bench press, which also needs a bench and a rack
    expect(names(["barbell", "dumbbells", "adjustable_bench"])).toEqual(["Incline Dumbbell Press", "Push-Up"]);
    expect(names(["barbell", "flat_bench", "squat_rack", "pull_up_bar"])).toEqual(["Barbell Bench Press", "Push-Up", "Pull-Up"]);
    expect(names([])).toEqual(["Push-Up"]);
    expect(names(undefined)).toHaveLength(5);
    expect(filterExercises(exercises, { availableEquipment: ["dumbbells", "adjustable_bench"], q: "press", muscle: "chest" }).map((e) => e.name)).toEqual(["Incline Dumbbell Press"]);
  });

  it("matches primary or secondary muscle and equipment", () => {
    expect(filterExercises(library, { muscle: "triceps" }).map((e) => e.name)).toEqual([
      "Barbell Bench Press",
      "Triceps Pushdown",
    ]);
    expect(filterExercises(library, { equipment: "cable" })).toHaveLength(1);
  });
});
