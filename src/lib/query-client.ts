import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { defaultShouldDehydrateQuery, type Query, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { storage } from "@/lib/storage";

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Kept long enough to be persisted, so history and stats stay readable offline.
      gcTime: 7 * DAY,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: (failureCount, error) => error instanceof ApiError && error.isNetworkError && failureCount < 2,
    },
  },
});

export const QUERY_CACHE_KEY = "fittune.query-cache";

export const queryPersister = createSyncStoragePersister({
  storage,
  key: QUERY_CACHE_KEY,
  throttleTime: 2000,
});

export const PERSIST_MAX_AGE = 7 * DAY;

/**
 * Kept in memory only:
 * - friends' progress, so a friend who stops sharing, unfriends or blocks does not stay
 *   readable from this device's storage
 * - FitHealth data, FitHealth is online only and must never show a stale diary
 */
export function shouldPersistQuery(query: Query) {
  const scope = query.queryKey[0];
  return defaultShouldDehydrateQuery(query) && scope !== "friends" && scope !== "health";
}
