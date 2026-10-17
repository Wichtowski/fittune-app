import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { AddWorkoutExercises } from "./add-workout-exercises";
import { createWorkout, workoutFromRoutine } from "../draft";
import { useWorkoutStore } from "../store";
import { fittune } from "@/api/fittune";
import { queryKeys } from "@/api/query-keys";
import { useSession } from "@/features/auth/session";
import type { Exercise } from "@/schemas/exercise";
import type { Routine, RoutineInput } from "@/schemas/routine";

vi.mock("@/hooks/use-media-query", () => ({ useIsDesktop: () => true }));

const bench: Exercise = {
  id: "bench", name: "Bench press", tracking: "weight_reps", primary_muscle: "chest",
  secondary_muscles: [], equipment: "barbell", requires: [], difficulty: "beginner",
  video_id: null, instructions: null, instructions_pl: null, is_custom: false,
  created_by: null, archived_at: null, created_at: "", updated_at: "", media: [],
};
const routine: Routine = {
  id: "routine", name: "Updated plan", notes: "Keep this note", last_performed_at: null,
  created_at: "", updated_at: "",
  exercises: [{
    id: "squat-entry", exercise_id: "squat", exercise_name: "Squat",
    tracking: "weight_reps", primary_muscle: "quadriceps", rest_seconds: 120, notes: "Keep this cue",
    sets: [{ kind: "normal", reps: 8, weight_kg: 60, duration_seconds: null, distance_m: null }],
  }],
};

function savedRoutine(input: RoutineInput): Routine {
  return {
    ...routine, ...input,
    exercises: input.exercises.map((exercise, index) => ({
      ...exercise, id: String(index), exercise_name: exercise.exercise_id === bench.id ? bench.name : "Squat",
      tracking: "weight_reps", primary_muscle: exercise.exercise_id === bench.id ? "chest" : "quadriceps",
    })),
  };
}

function setup(routineId: string | null = routine.id) {
  useSession.setState({ token: "token", userId: "user" });
  const workout = createWorkout({ routine_id: routineId });
  useWorkoutStore.getState().start(workout);
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(queryKeys.exercises.list(), [bench]);
  // A stale snapshot from when the workout started must not replace current plan edits.
  client.setQueryData(queryKeys.routines.detail(routine.id), { ...routine, name: "Old plan", exercises: [] });
  client.setQueryData(queryKeys.routines.list, [routine]);
  const get = vi.spyOn(fittune, "getRoutine").mockResolvedValue(routine);
  const update = vi.spyOn(fittune, "updateRoutine").mockImplementation(async (_id, input) => savedRoutine(input));
  function Picker() {
    const [open, setOpen] = useState(true);
    return <AddWorkoutExercises workout={workout} open={open} onOpenChange={setOpen} />;
  }
  render(<QueryClientProvider client={client}><Picker /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: /Bench press/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add exercises: 1" }));
  return { client, get, update };
}

afterEach(() => {
  vi.restoreAllMocks();
  useWorkoutStore.getState().reset();
  useSession.getState().clear();
});

it("lets an added exercise stay in this workout without changing the plan", () => {
  const { get, update } = setup();
  expect(useWorkoutStore.getState().active?.exercises.map((exercise) => exercise.exercise_id)).toEqual(["bench"]);
  expect(screen.getByRole("alertdialog")).toHaveTextContent("Also save exercises to the routine?");
  fireEvent.click(screen.getByRole("button", { name: "Only this workout" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(get).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
  expect(useWorkoutStore.getState().active?.exercises).toHaveLength(1);
});

it("saves new exercises for the next workout while preserving the latest plan and refreshing its cache", async () => {
  const { client, get, update } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Save to routine" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(get).toHaveBeenCalledWith(routine.id);
  expect(update).toHaveBeenCalledWith(routine.id, {
    name: routine.name, notes: routine.notes,
    exercises: [
      {
        exercise_id: "squat", rest_seconds: 120, notes: "Keep this cue",
        sets: routine.exercises[0]!.sets,
      },
      {
        exercise_id: "bench", rest_seconds: 90, notes: null,
        sets: [{ kind: "normal", reps: null, weight_kg: null, duration_seconds: null, distance_m: null }],
      },
    ],
  });
  const saved = client.getQueryData<Routine>(queryKeys.routines.detail(routine.id))!;
  expect(workoutFromRoutine(saved).exercises.map((exercise) => exercise.exercise_name)).toEqual(["Squat", "Bench press"]);
  expect(client.getQueryState(queryKeys.routines.list)?.isInvalidated).toBe(true);
  expect(useWorkoutStore.getState().active?.exercises).toHaveLength(1);
});

it("adds exercises directly when the workout has no plan", () => {
  const { get, update } = setup(null);
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(useWorkoutStore.getState().active?.exercises).toHaveLength(1);
  expect(get).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it("keeps the workout and offers retry when saving the plan fails", async () => {
  const { update } = setup();
  update.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Save to routine" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("They are kept in this workout");
  expect(useWorkoutStore.getState().active?.exercises).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Save to routine" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(update).toHaveBeenCalledTimes(2);
  expect(useWorkoutStore.getState().active?.exercises).toHaveLength(1);
});

it("does not duplicate exercises after the server saved them but the response was lost", async () => {
  const { get, update } = setup();
  update.mockImplementationOnce(async (_id, input) => {
    get.mockResolvedValue(savedRoutine(input));
    throw new Error("response lost");
  });
  fireEvent.click(screen.getByRole("button", { name: "Save to routine" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Save to routine" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(update).toHaveBeenCalledOnce();
  expect(get).toHaveBeenCalledTimes(2);
});

it("does not write to a plan with a different user's session after loading it", async () => {
  const { get, update } = setup();
  get.mockImplementationOnce(async () => {
    useSession.setState({ token: "new-token", userId: "new-user" });
    return routine;
  });
  fireEvent.click(screen.getByRole("button", { name: "Save to routine" }));
  await screen.findByRole("alert");
  expect(update).not.toHaveBeenCalled();
});
