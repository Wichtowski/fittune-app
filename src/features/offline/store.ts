import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { storage } from "@/lib/storage";

type OfflineSyncState = {
  status: "idle" | "syncing" | "error";
  /** When everything was last downloaded for offline use */
  lastSyncedAt: string | null;
  error: string | null;
  started: () => void;
  finished: (at: string) => void;
  failed: (message: string) => void;
  reset: () => void;
};

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set) => ({
      status: "idle",
      lastSyncedAt: null,
      error: null,
      started: () => set({ status: "syncing", error: null }),
      finished: (at) => set({ status: "idle", lastSyncedAt: at, error: null }),
      failed: (message) => set({ status: "error", error: message }),
      reset: () => set({ status: "idle", lastSyncedAt: null, error: null }),
    }),
    {
      name: "fittune.offline-sync",
      storage: createJSONStorage(() => storage),
      // Only the timestamp survives a reload; an interrupted sync is simply not running
      partialize: (state) => ({ lastSyncedAt: state.lastSyncedAt }),
    },
  ),
);
