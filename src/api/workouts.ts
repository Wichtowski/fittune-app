import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import { pageSchema } from "@/schemas/common";
import { type WorkoutInput, workoutSchema, workoutSummarySchema } from "@/schemas/workout";

const workoutPageSchema = pageSchema(workoutSummarySchema);

export const workoutsInfiniteQuery = (status?: "in_progress" | "completed") =>
  infiniteQueryOptions({
    queryKey: queryKeys.workouts.list(status),
    queryFn: ({ pageParam, signal }) =>
      request("/workouts", { schema: workoutPageSchema, query: { status, cursor: pageParam, limit: 20 }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const workoutQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.workouts.detail(id),
    queryFn: ({ signal }) => request(`/workouts/${id}`, { schema: workoutSchema, signal }),
  });

export const getWorkout = (id: string) => request(`/workouts/${id}`, { schema: workoutSchema });

export const putWorkout = (id: string, input: WorkoutInput) =>
  request(`/workouts/${id}`, { method: "PUT", body: input, schema: workoutSchema });

export const deleteWorkout = (id: string) => request(`/workouts/${id}`, { method: "DELETE" });
