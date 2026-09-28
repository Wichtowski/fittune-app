import { afterEach, describe, expect, it, vi } from "vitest";

import { useOfflineSyncStore } from "./store";
import { runOfflineSync, stopOfflineSync } from "./use-offline-sync";
import { ApiError, request } from "@/api/client";
import { queryClient } from "@/lib/query-client";

vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  request: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  stopOfflineSync();
  queryClient.clear();
});

/** Every request answers after a tick, with an empty list or an empty page */
function slowApi() {
  const answer = (path: string): unknown => (path === "/workouts" ? { items: [], next_cursor: null } : path === "/me" ? { id: "me" } : []);
  vi.mocked(request).mockImplementation(((path: string) =>
    new Promise<unknown>((resolve) => setTimeout(() => resolve(answer(path)), 5))) as unknown as typeof request);
}

describe("runOfflineSync", () => {
  it.each([
    ["the servers are down", new ApiError(503, "unavailable", "Service unavailable")],
    ["Cloudflare cannot reach the origin", new ApiError(522, "http_error", "Connection timed out")],
    ["nothing answers", new ApiError(0, "network_error", "offline")],
  ])("stops syncing at once when %s", async (_, error) => {
    // Fake timers: a retry delay would leave the sync waiting, as the stuck button did
    vi.useFakeTimers();
    vi.mocked(request).mockRejectedValue(error);
    await runOfflineSync();
    const state = useOfflineSyncStore.getState();
    expect(state.status).toBe("error");
    expect(state.lastSyncedAt).toBeNull();
  });

  it("finishes even when other screens refetch or cancel the same data meanwhile", async () => {
    slowApi();
    const sync = runOfflineSync();
    expect(useOfflineSyncStore.getState().status).toBe("syncing");
    void queryClient.invalidateQueries();
    void queryClient.cancelQueries();
    await sync;
    expect(useOfflineSyncStore.getState().status).toBe("idle");
    expect(useOfflineSyncStore.getState().lastSyncedAt).not.toBeNull();
  });

  it("discards a sync stopped by signing out", async () => {
    slowApi();
    const sync = runOfflineSync();
    stopOfflineSync();
    await sync;
    expect(useOfflineSyncStore.getState()).toMatchObject({ status: "idle", lastSyncedAt: null, error: null });
  });
});
