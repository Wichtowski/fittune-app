import { afterEach, describe, expect, it, vi } from "vitest";

import { useOfflineSyncStore } from "./store";
import { runOfflineSync } from "./use-offline-sync";
import { ApiError, request } from "@/api/client";

vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  request: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  useOfflineSyncStore.getState().reset();
});

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
});
