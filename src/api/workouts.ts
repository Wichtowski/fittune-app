import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import { pageSchema } from "@/schemas/common";
import { type WorkoutInput, workoutSchema, workoutSummarySchema } from "@/schemas/workout";

const workoutPageSchema = pageSchema(workoutSummarySchema);

export const getWorkoutsPage = (status?: "in_progress" | "completed", cursor?: string, signal?: AbortSignal) =>
  request("/workouts", { schema: workoutPageSchema, query: { status, cursor, limit: 20 }, signal });

export const workoutsInfiniteQuery = (status?: "in_progress" | "completed") =>
  infiniteQueryOptions({
    queryKey: queryKeys.workouts.list(status),
    queryFn: ({ pageParam, signal }) => getWorkoutsPage(status, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const getWorkout = (id: string, signal?: AbortSignal) => request(`/workouts/${id}`, { schema: workoutSchema, signal });

export const workoutQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.workouts.detail(id),
    queryFn: ({ signal }) => getWorkout(id, signal),
  });

export const putWorkout = (id: string, input: WorkoutInput) =>
  request(`/workouts/${id}`, { method: "PUT", body: input, schema: workoutSchema });

export const deleteWorkout = (id: string) => request(`/workouts/${id}`, { method: "DELETE" });
