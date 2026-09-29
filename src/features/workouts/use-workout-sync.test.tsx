// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { createWorkout } from "./draft";
import { useWorkoutStore } from "./store";
import { useWorkoutSync } from "./use-workout-sync";
import { fittune } from "@/api/fittune";
import { useSession } from "@/features/auth/session";
import type { Workout } from "@/schemas/workout";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  useWorkoutStore.getState().reset();
  useSession.getState().clear();
});

it("does not restore the previous user's cached workout after switching sessions", async () => {
  vi.useFakeTimers();
  useSession.setState({ token: "old-token", userId: "old-user" });
  const workout = createWorkout();
  useWorkoutStore.getState().start(workout);
  let finish!: (workout: Workout) => void;
  vi.spyOn(fittune, "putWorkout").mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { unmount } = renderHook(useWorkoutSync, { wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(800); });
  expect(fittune.putWorkout).toHaveBeenCalledOnce();
  await act(async () => {
    useSession.setState({ token: "new-token", userId: "new-user" });
    useWorkoutStore.getState().reset();
    client.clear();
    finish({ ...workout, created_at: workout.started_at, updated_at: workout.started_at });
    await Promise.resolve();
  });
  expect(client.getQueryCache().getAll()).toEqual([]);
  unmount();
});
