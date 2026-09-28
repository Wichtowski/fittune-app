import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

export const workoutsInfiniteQuery = (status?: "in_progress" | "completed") =>
  infiniteQueryOptions({
    queryKey: queryKeys.workouts.list(status),
    queryFn: ({ pageParam, signal }) => fittune.getWorkoutsPage(status, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const workoutQuery = (id: string) =>
  queryOptions({ queryKey: queryKeys.workouts.detail(id), queryFn: ({ signal }) => fittune.getWorkout(id, signal) });
