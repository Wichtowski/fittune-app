import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

/**
 * The full visible library, without instruction texts. Filtering happens client-side because it
 * must work offline; the list is over a thousand exercises, so screens render it incrementally.
 */
export const exercisesQuery = () =>
  queryOptions({
    queryKey: queryKeys.exercises.list(),
    queryFn: ({ signal }) => fittune.getExercises(signal),
    staleTime: 30 * 60_000,
  });

export const exerciseQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.exercises.detail(id),
    queryFn: ({ signal }) => fittune.getExercise(id, signal),
  });

export const exerciseHistoryQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.exercises.history(id),
    queryFn: ({ signal }) => fittune.getExerciseHistory(id, signal),
  });
