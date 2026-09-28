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
 * Friends' progress stays in memory only: a friend who stops sharing, unfriends or blocks must
 * not stay readable from this device's storage
 */
export function shouldPersistQuery(query: Query) {
  return defaultShouldDehydrateQuery(query) && query.queryKey[0] !== "friends";
}
