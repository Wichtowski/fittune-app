import { expect, it } from "vitest";

import { routineFormSchemaFor } from "./routine";

const form = {
  name: "Test", notes: "", exercises: [{
    exercise_id: "00000000-0000-4000-8000-000000000001", exercise_name: "Test",
    tracking: "weight_reps", rest_seconds: 90,
    sets: [{ kind: "normal", reps: 5, weight: 100, duration_seconds: "", distance: "" }],
  }],
};

it.each(["reps", "duration_seconds"])("rejects fractional %s before saving", (field) => {
  const schema = routineFormSchemaFor({ weightUnit: "kg", distanceUnit: "km" });
  const exercises = [{ ...form.exercises[0]!, sets: [{ ...form.exercises[0]!.sets[0]!, [field]: 1.5 }] }];
  expect(schema.safeParse({ ...form, exercises }).success).toBe(false);
  expect(schema.safeParse({ ...form, exercises: [{ ...form.exercises[0]!, rest_seconds: 1.5 }] }).success).toBe(false);
});

it.each([
  ["kg", "km", 1000, 1000],
  ["lb", "mi", 2204.62, 621.37],
] as const)("validates converted limits in %s and %s", (weightUnit, distanceUnit, weight, distance) => {
  const schema = routineFormSchemaFor({ weightUnit, distanceUnit });
  const withValues = (w: number, d: number) => ({ ...form, exercises: [{ ...form.exercises[0]!, sets: [{ ...form.exercises[0]!.sets[0]!, weight: w, distance: d }] }] });
  expect(schema.safeParse(withValues(weight, distance)).success).toBe(true);
  expect(schema.safeParse(withValues(weight + 1, distance)).success).toBe(false);
  expect(schema.safeParse(withValues(weight, distance + 1)).success).toBe(false);
});
