import type { QueryClient } from "@tanstack/react-query";

import { meQuery } from "@/api/auth";
import { exerciseHistoryQuery, exercisesQuery } from "@/api/exercises";
import { placesQuery } from "@/api/places";
import { routinesQuery } from "@/api/routines";
import { recordsQuery } from "@/api/stats";
import { workoutQuery, workoutsInfiniteQuery } from "@/api/workouts";

/** Recent workouts whose details, and whose exercises' history, are kept for offline use */
export const OFFLINE_WORKOUTS = 20;
const MAX_EXERCISE_HISTORIES = 30;
const CONCURRENCY = 4;

export type SyncResult = { failed: number };

/**
 * Downloads what the app needs without a connection into the persisted query cache: profile,
 * exercise library, routines, places, records, recent workouts with their details, and the
 * history of the exercises in them. Screens opened earlier stay cached as before; this only
 * makes sure the common ones are there before the user goes offline
 */
export async function syncForOffline(queryClient: QueryClient): Promise<SyncResult> {
  // Always refetch, a sync that returns cached data would not be a sync
  const fresh = { staleTime: 0 } as const;

  // Core data first and in order: if the first request fails the API is unreachable
  await queryClient.fetchQuery({ ...meQuery(), ...fresh });
  await Promise.all([
    queryClient.fetchQuery({ ...exercisesQuery(), ...fresh }),
    queryClient.fetchQuery({ ...routinesQuery(), ...fresh }),
    queryClient.fetchQuery({ ...placesQuery(), ...fresh }),
    queryClient.fetchQuery({ ...recordsQuery(), ...fresh }),
  ]);
  const history = await queryClient.fetchInfiniteQuery({ ...workoutsInfiniteQuery("completed"), ...fresh });
  await queryClient.fetchInfiniteQuery({ ...workoutsInfiniteQuery("in_progress"), ...fresh });

  const workoutIds = history.pages.flatMap((page) => page.items).slice(0, OFFLINE_WORKOUTS).map((w) => w.id);
  const workouts = await settle(workoutIds, (id) => queryClient.fetchQuery({ ...workoutQuery(id), ...fresh }));

  const exerciseIds = [...new Set(workouts.ok.flatMap((workout) => workout.exercises.map((e) => e.exercise_id)))];
  const histories = await settle(exerciseIds.slice(0, MAX_EXERCISE_HISTORIES), (id) =>
    queryClient.fetchQuery({ ...exerciseHistoryQuery(id), ...fresh }),
  );

  return { failed: workouts.failed + histories.failed };
}

/** Runs `task` for every item with limited concurrency, collecting results and failures */
async function settle<T, R>(items: readonly T[], task: (item: T) => Promise<R>): Promise<{ ok: R[]; failed: number }> {
  const ok: R[] = [];
  let failed = 0;
  // One iterator shared by all workers hands out each item exactly once
  const queue = items.values();
  const worker = async () => {
    for (const item of queue) {
      try {
        ok.push(await task(item));
      } catch {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return { ok, failed };
}
