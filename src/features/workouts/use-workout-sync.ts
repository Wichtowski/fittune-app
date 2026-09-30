import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { type DraftWorkout, needsSync, toWorkoutInput } from "./draft";
import { useWorkoutStore } from "./store";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/api/query-keys";
import { fittune } from "@/api/fittune";
import { useSession } from "@/features/auth/session";
import { useOnlineStatus } from "@/hooks/use-online-status";

export const SYNC_MUTATION_KEY = ["workouts", "sync"] as const;
export const WORKOUT_WRITE_SCOPE = { id: "workout-writes" };
/** Coalesces rapid edits (typing reps, ticking sets) into one request. */
const DEBOUNCE_MS = 800;
const MAX_BACKOFF_MS = 60_000;

/** Id and revision of the next workout that needs uploading, as a primitive for stable selection. */
function selectNextKey(state: { active: DraftWorkout | null; outbox: DraftWorkout[]; discardingId: string | null }): string | null {
  // Finished workouts first: they are complete and the user expects them in history.
  const next = [...state.outbox, state.active].find((w): w is DraftWorkout => w !== null && w.id !== state.discardingId && needsSync(w));
  return next ? `${next.id}:${next.revision}` : null;
}

function findWorkout(id: string): DraftWorkout | undefined {
  const { active, outbox } = useWorkoutStore.getState();
  return active?.id === id ? active : outbox.find((w) => w.id === id);
}

/**
 * Background uploader for locally edited workouts. Mounted once in the app shell.
 *
 * The UI never waits for it: edits land in the persisted store immediately and this hook
 * replays the latest full snapshot with `PUT /workouts/{id}`. Because writes are idempotent
 * and revision-checked, retries after a flaky gym connection are always safe.
 */
export function useWorkoutSync() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const userId = useSession((state) => state.userId);
  const token = useSession((state) => state.token);
  const ownerId = useWorkoutStore((state) => state.ownerId);
  const nextKey = useWorkoutStore(selectNextKey);
  const [attempt, setAttempt] = useState(0);
  const retryAt = useRef(0);
  const failures = useRef(0);
  const inFlight = useRef(false);

  const { mutateAsync } = useMutation({
    mutationKey: SYNC_MUTATION_KEY,
    scope: WORKOUT_WRITE_SCOPE,
    mutationFn: ({ workout, token }: { workout: DraftWorkout; token: string }) => {
      if (useSession.getState().token !== token) throw new Error("Session changed");
      return fittune.putWorkout(workout.id, toWorkoutInput(workout));
    },
    retry: false,
  });

  useEffect(() => {
    // Never upload one user's local workouts with another user's session.
    if (!nextKey || !online || inFlight.current || !token || !userId || ownerId !== userId) return;
    const sessionIsCurrent = () => useSession.getState().token === token && useWorkoutStore.getState().ownerId === userId;
    const [id] = nextKey.split(":");
    const delay = Math.max(DEBOUNCE_MS, retryAt.current - Date.now());

    const timer = window.setTimeout(async () => {
      const workout = id ? findWorkout(id) : undefined;
      if (!workout || useWorkoutStore.getState().discardingId === workout.id || !needsSync(workout) || !sessionIsCurrent()) return;
      const store = useWorkoutStore.getState();
      inFlight.current = true;
      try {
        const saved = await mutateAsync({ workout, token });
        if (!sessionIsCurrent()) return;
        retryAt.current = 0;
        failures.current = 0;
        store.markSynced(workout.id, workout.revision);
        queryClient.setQueryData(queryKeys.workouts.detail(saved.id), saved);
        void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all, refetchType: "active" });
        if (saved.ended_at) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
          void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
          void queryClient.invalidateQueries({ queryKey: ["exercises", "history"] });
        }
      } catch (error) {
        if (!sessionIsCurrent()) return;
        if (!(error instanceof ApiError)) {
          store.markFailed(workout.id, workout.revision, "Unexpected error while saving");
        } else if (error.status === 409) {
          // Another device saved a newer revision; keep this device's version on top.
          const server = await fittune.getWorkout(workout.id).catch(() => null);
          if (!sessionIsCurrent()) return;
          if (server) store.rebase(workout.id, server.revision);
          else store.markFailed(workout.id, workout.revision, error.message);
        } else if (error.isRetryable) {
          failures.current += 1;
          retryAt.current = Date.now() + Math.min(MAX_BACKOFF_MS, 1000 * 2 ** failures.current);
        } else if (error.status !== 401) {
          store.markFailed(workout.id, workout.revision, error.message);
        }
      } finally {
        inFlight.current = false;
        setAttempt((n) => n + 1);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [nextKey, online, attempt, userId, token, ownerId, mutateAsync, queryClient]);
}

/** Serialize deletion after any upload and retain the draft until deletion succeeds */
export function useDiscardWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: WORKOUT_WRITE_SCOPE,
    networkMode: "always",
    retry: false,
    mutationFn: async ({ workout, token, deleteRemote }: { workout: DraftWorkout; token: string | null; deleteRemote: boolean }) => {
      if (useSession.getState().token !== token) throw new Error("Session changed");
      if (deleteRemote) {
        try {
          await fittune.deleteWorkout(workout.id);
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
      }
    },
    onMutate: ({ workout }) => useWorkoutStore.getState().setDiscarding(workout.id),
    onSuccess: (_result, { workout, token }) => {
      if (useSession.getState().token !== token) return;
      useWorkoutStore.getState().discard(workout.id);
      return queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
    },
    onSettled: (_result, _error, { workout }) => {
      const store = useWorkoutStore.getState();
      if (store.discardingId === workout.id) store.setDiscarding(null);
    },
  });
}

export type SyncStatus = "synced" | "saving" | "pending" | "offline" | "error";

/** Summarised upload state for the small sync indicator. */
export function useSyncStatus(): { status: SyncStatus; error: string | null; failedId: string | null } {
  const online = useOnlineStatus();
  const saving = useIsMutating({ mutationKey: SYNC_MUTATION_KEY }) > 0;
  const summary = useWorkoutStore((state) => {
    const all = [state.active, ...state.outbox].filter((w): w is DraftWorkout => w !== null);
    const failed = all.find((w) => w.failedRevision === w.revision);
    const pending = all.some((w) => w.revision > w.syncedRevision);
    return failed ? `error:${failed.id}:${failed.syncError ?? ""}` : pending ? "pending" : "synced";
  });

  if (summary.startsWith("error:")) {
    const [, failedId = null, ...message] = summary.split(":");
    return { status: "error", error: message.join(":") || "Could not save workout", failedId };
  }
  if (summary === "pending") return { status: saving ? "saving" : online ? "pending" : "offline", error: null, failedId: null };
  return { status: "synced", error: null, failedId: null };
}
