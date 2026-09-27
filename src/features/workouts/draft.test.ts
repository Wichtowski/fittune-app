import { describe, expect, it } from "vitest";

import { createWorkout, edits, exerciseFromRef, needsSync, revise, toWorkoutInput, totals, workedMuscles } from "./draft";

const bench = {
  exercise_id: "00000000-0000-4000-8000-00000000000a",
  exercise_name: "Barbell Bench Press",
  tracking: "weight_reps" as const,
  primary_muscle: "chest" as const,
};

function withBench() {
  const workout = createWorkout({ title: "Push" });
  return revise(workout, edits.addExercises([bench]));
}

describe("workout draft", () => {
  it("bumps the revision on every edit and clears failures", () => {
    const workout = { ...withBench(), failedRevision: 2, syncError: "boom" };
    const next = revise(workout, edits.rename("Heavy push"));
    expect(next.revision).toBe(workout.revision + 1);
    expect(next.failedRevision).toBeNull();
    expect(next.syncError).toBeNull();
  });

  it("keeps the same object when an edit is a no-op", () => {
    const workout = withBench();
    const exerciseId = workout.exercises[0]!.id;
    expect(revise(workout, edits.moveExercise(exerciseId, -1))).toBe(workout);
  });

  it("new sets copy the previous set's values but not its completion", () => {
    let workout = withBench();
    const exercise = workout.exercises[0]!;
    const first = exercise.sets[0]!;
    workout = revise(workout, edits.updateSet(exercise.id, first.id, { weight_kg: 100, reps: 5, completed: true }));
    workout = revise(workout, edits.addSet(exercise.id));

    const [, second] = workout.exercises[0]!.sets;
    expect(second).toMatchObject({ weight_kg: 100, reps: 5, completed: false, kind: "normal" });
    expect(second!.id).not.toBe(first.id);
  });

  it("reorders exercises", () => {
    let workout = revise(createWorkout(), edits.addExercises([bench, { ...bench, exercise_name: "Dip" }]));
    const [a, b] = workout.exercises;
    workout = revise(workout, edits.moveExercise(b!.id, -1));
    expect(workout.exercises.map((e) => e.id)).toEqual([b!.id, a!.id]);
  });

  it("totals count only completed working sets", () => {
    const exercise = exerciseFromRef(bench, 0);
    exercise.sets = [
      { id: "1", kind: "warmup", reps: 10, weight_kg: 40, duration_seconds: null, distance_m: null, rpe: null, completed: true },
      { id: "2", kind: "normal", reps: 5, weight_kg: 100, duration_seconds: null, distance_m: null, rpe: null, completed: true },
      { id: "3", kind: "normal", reps: 5, weight_kg: 100, duration_seconds: null, distance_m: null, rpe: null, completed: false },
    ];
    expect(totals({ exercises: [exercise] })).toEqual({ completedSets: 1, totalSets: 3, volumeKg: 500, reps: 5 });
    expect(workedMuscles({ exercises: [exercise] })).toEqual([{ muscle: "chest", sets: 1 }]);
  });

  it("groups completed working sets by primary muscle", () => {
    const chest = exerciseFromRef(bench, 2);
    chest.sets.forEach((set) => { set.completed = true; });
    const back = exerciseFromRef({ ...bench, primary_muscle: "lats" }, 1);
    back.sets[0]!.completed = true;
    expect(workedMuscles({ exercises: [back, chest] })).toEqual([
      { muscle: "chest", sets: 2 },
      { muscle: "lats", sets: 1 },
    ]);
  });

  it("clamps forgotten workouts to the API's 24h limit when finishing", () => {
    const workout = { ...createWorkout(), started_at: "2026-09-01T10:00:00.000Z" };
    const finished = revise(workout, edits.finish(new Date("2026-09-03T10:00:00.000Z")));
    expect(finished.ended_at).toBe("2026-09-02T10:00:00.000Z");
  });

  it("needs sync until the server acknowledges the latest revision", () => {
    const workout = withBench();
    expect(needsSync(workout)).toBe(true);
    expect(needsSync({ ...workout, syncedRevision: workout.revision })).toBe(false);
    expect(needsSync({ ...workout, failedRevision: workout.revision })).toBe(false);
  });

  it("persists the selected setup through offline edits and finishing without changing exercises", () => {
    const place = { id: "place", version_id: "version-1", name: "Home", kind: "home" as const, equipment: ["resistance_band" as const] };
    const draft = revise(withBench(), edits.setPlace(place));
    place.name = "Gym";
    place.equipment.length = 0;
    const restored = JSON.parse(JSON.stringify(draft)) as typeof draft;
    expect(restored.place).toMatchObject({ name: "Home", equipment: ["resistance_band"] });
    expect(needsSync(restored)).toBe(true);
    expect(toWorkoutInput(revise(restored, edits.finish())).place_version_id).toBe("version-1");
    const cleared = revise(restored, edits.setPlace(null));
    expect(cleared.exercises).toEqual(restored.exercises);
    expect(cleared.revision).toBe(restored.revision + 1);
    expect(toWorkoutInput(cleared).place_version_id).toBeNull();
    expect(toWorkoutInput({ ...restored, place: undefined }).place_version_id).toBeUndefined();
  });

  it("builds the API body without local-only fields", () => {
    const input = toWorkoutInput(withBench());
    expect(input).not.toHaveProperty("syncedRevision");
    expect(input.exercises[0]).not.toHaveProperty("exercise_name");
    expect(input.exercises[0]!.sets).toHaveLength(1);
  });
});
