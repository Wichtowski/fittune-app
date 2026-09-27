import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type DraftWorkout, type Edit, edits, revise } from "./draft";
import { useSession } from "@/features/auth/session";
import { storage } from "@/lib/storage";

export type RestTimer = { exerciseId: string; endsAt: number; total: number };

type WorkoutState = {
  /** User the local workouts belong to; they are only ever synced with that user's session. */
  ownerId: string | null;
  /** The workout being logged right now, persisted on every change. */
  active: DraftWorkout | null;
  /** Finished workouts the server has not confirmed yet (e.g. finished offline). */
  outbox: DraftWorkout[];
  rest: RestTimer | null;

  start: (workout: DraftWorkout) => void;
  edit: (edit: Edit) => void;
  finish: () => DraftWorkout | null;
  discard: () => DraftWorkout | null;

  markSynced: (id: string, revision: number) => void;
  markFailed: (id: string, revision: number, message: string) => void;
  retry: (id: string) => void;
  /** After a 409, make the local copy newer than the server's so this device's edits win. */
  rebase: (id: string, serverRevision: number) => void;

  startRest: (exerciseId: string, seconds: number) => void;
  adjustRest: (deltaSeconds: number) => void;
  clearRest: () => void;
  reset: () => void;
};

function update(state: Pick<WorkoutState, "active" | "outbox">, id: string, fn: (w: DraftWorkout) => DraftWorkout) {
  return {
    active: state.active?.id === id ? fn(state.active) : state.active,
    outbox: state.outbox.map((w) => (w.id === id ? fn(w) : w)),
  };
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      ownerId: null,
      active: null,
      outbox: [],
      rest: null,

      start: (workout) => set({ active: workout, rest: null, ownerId: useSession.getState().userId }),

      edit: (edit) => {
        const { active } = get();
        if (active) set({ active: revise(active, edit) });
      },

      finish: () => {
        const { active, outbox } = get();
        if (!active) return null;
        const finished = revise(active, edits.finish());
        set({ active: null, outbox: [...outbox, finished], rest: null });
        return finished;
      },

      discard: () => {
        const { active } = get();
        set({ active: null, rest: null });
        return active;
      },

      markSynced: (id, revision) =>
        set((state) => {
          const next = update(state, id, (w) => ({ ...w, syncedRevision: Math.max(w.syncedRevision, revision) }));
          // Finished workouts leave the outbox once the server has their final revision.
          return {
            ...next,
            outbox: next.outbox.filter((w) => w.syncedRevision < w.revision),
          };
        }),

      markFailed: (id, revision, message) =>
        set((state) =>
          update(state, id, (w) => (w.revision === revision ? { ...w, failedRevision: revision, syncError: message } : w)),
        ),

      retry: (id) => set((state) => update(state, id, (w) => ({ ...w, failedRevision: null, syncError: null }))),

      rebase: (id, serverRevision) =>
        set((state) =>
          update(state, id, (w) => ({
            ...w,
            revision: Math.max(w.revision, serverRevision + 1),
            failedRevision: null,
            syncError: null,
          })),
        ),

      startRest: (exerciseId, seconds) =>
        set({ rest: seconds > 0 ? { exerciseId, endsAt: Date.now() + seconds * 1000, total: seconds } : null }),

      adjustRest: (delta) =>
        set(({ rest }) => {
          if (!rest) return {};
          const endsAt = rest.endsAt + delta * 1000;
          return endsAt <= Date.now() ? { rest: null } : { rest: { ...rest, endsAt, total: Math.max(1, rest.total + delta) } };
        }),

      clearRest: () => set({ rest: null }),

      reset: () => set({ ownerId: null, active: null, outbox: [], rest: null }),
    }),
    {
      name: "fittune.workout",
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: ({ ownerId, active, outbox, rest }) => ({ ownerId, active, outbox, rest }),
    },
  ),
);

/** Local workouts with changes the server has not seen yet. */
export function usePendingWorkouts(): number {
  return useWorkoutStore(
    (state) =>
      [state.active, ...state.outbox].filter((w) => w !== null && w.revision > w.syncedRevision).length,
  );
}
