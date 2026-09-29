import type { QueryClient } from "@tanstack/react-query";

import { account } from "@/api/account";
import { fittune } from "@/api/fittune";
import { queryKeys } from "@/api/query-keys";

/** Recent workouts whose details, and whose exercises' history, are kept for offline use */
export const OFFLINE_WORKOUTS = 20;
const MAX_EXERCISE_HISTORIES = 30;
const CONCURRENCY = 4;

export type SyncResult = { failed: number };

/**
 * Downloads what the app needs without a connection into the persisted query cache: profile,
 * exercise library, routines, places, records, recent workouts with their details, and the
 * history of the exercises in them.
 *
 * It calls the API directly and writes the results with setQueryData instead of fetching
 * through the query cache. Fetching through the cache joins a screen's fetch of the same data,
 * which may be waiting on retries or paused, and lets a refetch elsewhere cancel the sync
 * midway; both left "Sync now" spinning. Direct requests only end by answering, failing, or
 * timing out in the API client
 */
export async function syncForOffline(queryClient: QueryClient, signal?: AbortSignal): Promise<SyncResult> {
  const checkCancelled = () => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };
  checkCancelled();
  // Core data first and in order: if the first request fails the API is unreachable
  const me = await account.getMe(signal);
  checkCancelled();
  queryClient.setQueryData(queryKeys.me, me);
  const [exercises, routines, places, records] = await Promise.all([
    fittune.getExercises(signal),
    fittune.getRoutines(signal),
    fittune.getPlaces(signal),
    fittune.getRecords(signal),
  ]);
  checkCancelled();
  queryClient.setQueryData(queryKeys.exercises.list(), exercises);
  queryClient.setQueryData(queryKeys.routines.list, routines);
  queryClient.setQueryData(queryKeys.places, places);
  queryClient.setQueryData(queryKeys.stats.records, records);

  const [completed, inProgress] = await Promise.all([
    fittune.getWorkoutsPage("completed", undefined, signal),
    fittune.getWorkoutsPage("in_progress", undefined, signal),
  ]);
  checkCancelled();
  // A fresh first page replaces what was cached; older pages load again when scrolled to
  queryClient.setQueryData(queryKeys.workouts.list("completed"), { pages: [completed], pageParams: [undefined] });
  queryClient.setQueryData(queryKeys.workouts.list("in_progress"), { pages: [inProgress], pageParams: [undefined] });

  const workoutIds = completed.items.slice(0, OFFLINE_WORKOUTS).map((w) => w.id);
  const workouts = await settle(workoutIds, async (id) => {
    checkCancelled();
    const workout = await fittune.getWorkout(id, signal);
    checkCancelled();
    queryClient.setQueryData(queryKeys.workouts.detail(id), workout);
    return workout;
  });

  checkCancelled();
  const exerciseIds = [...new Set(workouts.ok.flatMap((workout) => workout.exercises.map((e) => e.exercise_id)))];
  const histories = await settle(exerciseIds.slice(0, MAX_EXERCISE_HISTORIES), async (id) => {
    checkCancelled();
    const history = await fittune.getExerciseHistory(id, signal);
    checkCancelled();
    queryClient.setQueryData(queryKeys.exercises.history(id), history);
  });

  checkCancelled();
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
