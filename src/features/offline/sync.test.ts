import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncForOffline } from "./sync";
import { ApiError, request } from "@/api/client";
import { exerciseHistoryQuery } from "@/api/exercises";
import { workoutQuery } from "@/api/workouts";

vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  request: vi.fn(),
}));

const requested: string[] = [];

function respond(path: string, options?: { query?: { status?: string } }) {
  requested.push(options?.query?.status ? `${path}?${options.query.status}` : path);
  if (path === "/workouts") {
    const items = options?.query?.status === "completed" ? [{ id: "w1" }, { id: "w2" }] : [];
    return Promise.resolve({ items, next_cursor: null });
  }
  if (path === "/workouts/w1") return Promise.resolve({ id: "w1", exercises: [{ exercise_id: "bench" }, { exercise_id: "squat" }] });
  if (path === "/workouts/w2") return Promise.resolve({ id: "w2", exercises: [{ exercise_id: "bench" }] });
  if (path === "/exercises/squat/history") return Promise.reject(new ApiError(500, "internal_error", "boom"));
  return Promise.resolve(path === "/me" ? { id: "me" } : []);
}

describe("syncForOffline", () => {
  beforeEach(() => {
    requested.length = 0;
    vi.mocked(request).mockReset().mockImplementation(respond as typeof request);
  });

  it("downloads core data, recent workouts and their exercises' history", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const result = await syncForOffline(client);

    expect(requested).toEqual(
      expect.arrayContaining(["/me", "/exercises", "/routines", "/places", "/stats/records", "/workouts?completed", "/workouts?in_progress", "/workouts/w1", "/workouts/w2", "/exercises/bench/history", "/exercises/squat/history"]),
    );
    // Each exercise's history is fetched once even when it appears in several workouts
    expect(requested.filter((path) => path === "/exercises/bench/history")).toHaveLength(1);
    expect(client.getQueryData(workoutQuery("w2").queryKey)).toMatchObject({ id: "w2" });
    expect(client.getQueryData(exerciseHistoryQuery("bench").queryKey)).toEqual([]);
    expect(result.failed).toBe(1);
  });

  it("stops at once when the API cannot be reached", async () => {
    vi.mocked(request).mockRejectedValue(new ApiError(0, "network_error", "offline"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(syncForOffline(client)).rejects.toMatchObject({ isNetworkError: true });
    expect(vi.mocked(request)).toHaveBeenCalledTimes(1);
  });
});
