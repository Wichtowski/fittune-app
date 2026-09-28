import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncForOffline } from "./sync";
import { ApiError } from "@/api/client";
import { send } from "@/api/transport";
import { meQuery } from "@/api/auth";
import { exerciseHistoryQuery } from "@/api/exercises";
import { workoutQuery } from "@/api/workouts";

vi.mock("@/api/transport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/transport")>()),
  send: vi.fn(),
}));

const requested: string[] = [];

function respond(path: string, options?: { query?: { status?: string } }) {
  requested.push(options?.query?.status ? `${path}?${options.query.status}` : path);
  if (path === "/train/workouts") {
    const items = options?.query?.status === "completed" ? [{ id: "w1" }, { id: "w2" }] : [];
    return Promise.resolve({ items, next_cursor: null });
  }
  if (path === "/train/workouts/w1") return Promise.resolve({ id: "w1", exercises: [{ exercise_id: "bench" }, { exercise_id: "squat" }] });
  if (path === "/train/workouts/w2") return Promise.resolve({ id: "w2", exercises: [{ exercise_id: "bench" }] });
  if (path === "/train/exercises/squat/history") return Promise.reject(new ApiError(500, "internal_error", "boom"));
  return Promise.resolve(path === "/me" ? { id: "me" } : []);
}

describe("syncForOffline", () => {
  beforeEach(() => {
    requested.length = 0;
    vi.mocked(send).mockReset().mockImplementation(respond as typeof send);
  });

  it("downloads core data, recent workouts and their exercises' history", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const result = await syncForOffline(client);

    expect(requested).toEqual(
      expect.arrayContaining(["/me", "/train/exercises", "/train/routines", "/train/places", "/train/stats/records", "/train/workouts?completed", "/train/workouts?in_progress", "/train/workouts/w1", "/train/workouts/w2", "/train/exercises/bench/history", "/train/exercises/squat/history"]),
    );
    // Each exercise's history is fetched once even when it appears in several workouts
    expect(requested.filter((path) => path === "/train/exercises/bench/history")).toHaveLength(1);
    expect(client.getQueryData(workoutQuery("w2").queryKey)).toMatchObject({ id: "w2" });
    expect(client.getQueryData(exerciseHistoryQuery("bench").queryKey)).toEqual([]);
    expect(result.failed).toBe(1);
  });

  it("does not wait behind a screen's fetch that is stuck retrying or paused", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // A screen's fetch of the same query that never settles, like a paused retry
    void client.prefetchQuery({ queryKey: meQuery().queryKey, queryFn: () => new Promise(() => {}) });
    await expect(syncForOffline(client)).resolves.toEqual({ failed: 1 });
    expect(client.getQueryData(meQuery().queryKey)).toEqual({ id: "me" });
  });

  it("stops at once when the API cannot be reached", async () => {
    vi.mocked(send).mockRejectedValue(new ApiError(0, "network_error", "offline"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(syncForOffline(client)).rejects.toMatchObject({ isNetworkError: true });
    expect(vi.mocked(send)).toHaveBeenCalledTimes(1);
  });
});
