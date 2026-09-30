import { afterEach, expect, it } from "vitest";

import { createWorkout, edits } from "./draft";
import { useWorkoutStore } from "./store";

afterEach(() => useWorkoutStore.getState().reset());

it("keeps the active workout when another start completes later", () => {
  const current = createWorkout({ title: "Current" });
  useWorkoutStore.getState().start(current);
  useWorkoutStore.getState().start(createWorkout({ title: "Late response" }));
  expect(useWorkoutStore.getState().active).toEqual(current);
});

it("keeps the draft unchanged while its deletion is pending", () => {
  const workout = createWorkout();
  const store = useWorkoutStore.getState();
  store.start(workout);
  store.setDiscarding(workout.id);
  store.edit(edits.rename("Changed during deletion"));
  expect(store.finish()).toBeNull();
  expect(useWorkoutStore.getState().active).toEqual(workout);
});

it("does not discard a different workout after a stale callback", () => {
  const workout = createWorkout();
  useWorkoutStore.getState().start(workout);
  expect(useWorkoutStore.getState().discard("old-workout")).toBeNull();
  expect(useWorkoutStore.getState().active).toEqual(workout);
});
