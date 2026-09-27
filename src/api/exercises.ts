import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import { exerciseHistorySchema, type ExerciseInput, exerciseSchema } from "@/schemas/exercise";

/** The full visible library. Filtering happens client-side: it is small and must work offline. */
export const exercisesQuery = () =>
  queryOptions({
    queryKey: queryKeys.exercises.list(),
    queryFn: ({ signal }) => request("/exercises", { schema: z.array(exerciseSchema), signal }),
    staleTime: 30 * 60_000,
  });

export const exerciseQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.exercises.detail(id),
    queryFn: ({ signal }) => request(`/exercises/${id}`, { schema: exerciseSchema, signal }),
  });

export const exerciseHistoryQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.exercises.history(id),
    queryFn: ({ signal }) =>
      request(`/exercises/${id}/history`, { schema: exerciseHistorySchema, query: { sessions: 50 }, signal }),
  });

export const createExercise = (input: ExerciseInput) =>
  request("/exercises", { method: "POST", body: input, schema: exerciseSchema });

export const updateExercise = (id: string, input: ExerciseInput) =>
  request(`/exercises/${id}`, { method: "PUT", body: input, schema: exerciseSchema });

export const archiveExercise = (id: string) => request(`/exercises/${id}`, { method: "DELETE" });
