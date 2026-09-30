// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { createWorkout } from "./draft";
import { useWorkoutStore } from "./store";
import { useDiscardWorkout, useWorkoutSync } from "./use-workout-sync";
import { fittune } from "@/api/fittune";
import { useSession } from "@/features/auth/session";
import type { Workout } from "@/schemas/workout";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  useWorkoutStore.getState().reset();
  useSession.getState().clear();
});

it("waits for an in-flight upload before deleting and prevents re-upload", async () => {
  vi.useFakeTimers();
  useSession.setState({ token: "token", userId: "user" });
  const workout = createWorkout();
  useWorkoutStore.getState().start(workout);
  let uploaded!: (workout: Workout) => void;
  const put = vi.spyOn(fittune, "putWorkout").mockImplementation(() => new Promise((resolve) => { uploaded = resolve; }));
  const remove = vi.spyOn(fittune, "deleteWorkout").mockResolvedValue(undefined);
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => {
    useWorkoutSync();
    return useDiscardWorkout();
  }, { wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(800); });
  expect(put).toHaveBeenCalledOnce();
  await act(async () => {
    result.current.mutate({ workout, token: "token", deleteRemote: true });
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(remove).not.toHaveBeenCalled();
  expect(useWorkoutStore.getState().active?.id).toBe(workout.id);
  await act(async () => {
    uploaded({ ...workout, created_at: workout.started_at, updated_at: workout.started_at });
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(remove).toHaveBeenCalledWith(workout.id);
  expect(useWorkoutStore.getState().active).toBeNull();
  expect(put).toHaveBeenCalledOnce();
  unmount();
});

it("retains a failed deletion's draft and discards an unsaved draft offline", async () => {
  useSession.setState({ token: "token", userId: "user" });
  const workout = { ...createWorkout(), syncedRevision: 1 };
  useWorkoutStore.getState().start(workout);
  const remove = vi.spyOn(fittune, "deleteWorkout").mockRejectedValue(new Error("offline"));
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(useDiscardWorkout, { wrapper });
  await act(async () => {
    await expect(result.current.mutateAsync({ workout, token: "token", deleteRemote: true })).rejects.toThrow("offline");
  });
  expect(useWorkoutStore.getState().active).toEqual(workout);
  expect(useWorkoutStore.getState().discardingId).toBeNull();
  await act(async () => {
    await result.current.mutateAsync({ workout, token: "token", deleteRemote: false });
  });
  expect(useWorkoutStore.getState().active).toBeNull();
  expect(remove).toHaveBeenCalledOnce();
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
