import type { QueryClient, QueryKey } from "@tanstack/react-query";

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
  const own = ownFetch(queryClient);

  // Core data first and in order: if the first request fails the API is unreachable
  await own(meQuery(), (o) => queryClient.fetchQuery(o));
  await Promise.all([
    own(exercisesQuery(), (o) => queryClient.fetchQuery(o)),
    own(routinesQuery(), (o) => queryClient.fetchQuery(o)),
    own(placesQuery(), (o) => queryClient.fetchQuery(o)),
    own(recordsQuery(), (o) => queryClient.fetchQuery(o)),
  ]);
  const history = await own(workoutsInfiniteQuery("completed"), (o) => queryClient.fetchInfiniteQuery(o));
  await own(workoutsInfiniteQuery("in_progress"), (o) => queryClient.fetchInfiniteQuery(o));

  const workoutIds = history.pages.flatMap((page) => page.items).slice(0, OFFLINE_WORKOUTS).map((w) => w.id);
  const workouts = await settle(workoutIds, (id) => own(workoutQuery(id), (o) => queryClient.fetchQuery(o)));

  const exerciseIds = [...new Set(workouts.ok.flatMap((workout) => workout.exercises.map((e) => e.exercise_id)))];
  const histories = await settle(exerciseIds.slice(0, MAX_EXERCISE_HISTORIES), (id) =>
    own(exerciseHistoryQuery(id), (o) => queryClient.fetchQuery(o)),
  );

  return { failed: workouts.failed + histories.failed };
}

/** Always refetch, never retry, never pause: the next sync tries again */
const OWN_FETCH = { staleTime: 0, retry: false, networkMode: "always" } as const;

/**
 * Runs a fetch for the sync on its own terms. A screen may already be loading the same query
 * with retries that wait, and pause while the window is in the background; fetching normally
 * would join that fetch and wait with it, which kept "Sync now" spinning. So such a fetch is
 * cancelled first and the sync starts its own
 */
function ownFetch(queryClient: QueryClient) {
  return async <O extends { queryKey: QueryKey }, R>(options: O, run: (options: O & typeof OWN_FETCH) => Promise<R>) => {
    await queryClient.cancelQueries({ queryKey: options.queryKey, exact: true });
    return run({ ...options, ...OWN_FETCH });
  };
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
