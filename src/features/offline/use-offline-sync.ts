import { isCancelledError, onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";

import { useOfflineSyncStore } from "./store";
import { syncForOffline } from "./sync";
import { ApiError } from "@/api/client";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queryClient } from "@/lib/query-client";

/** Automatic syncs happen at most this often; the button in Profile can always sync */
const AUTO_SYNC_EVERY = 15 * 60 * 1000;

/** Downloads data for offline use unless a sync is already running */
export async function runOfflineSync() {
  const store = useOfflineSyncStore.getState();
  if (store.status === "syncing" || !onlineManager.isOnline()) return;
  store.started();
  try {
    const { failed } = await syncForOffline(queryClient);
    const state = useOfflineSyncStore.getState();
    if (failed > 0) state.failed(`${failed} item${failed === 1 ? "" : "s"} could not be downloaded. Try again later.`);
    else state.finished(new Date().toISOString());
  } catch (error) {
    // Signing out cancels a running sync; that is not a failure to report
    if (isCancelledError(error)) return;
    useOfflineSyncStore
      .getState()
      .failed(error instanceof ApiError && error.isNetworkError ? "Can't reach FitTune right now." : "Sync failed. Try again later.");
  }
}

/** Keeps offline data fresh: syncs when the app opens and whenever the connection returns */
export function useAutoOfflineSync() {
  const online = useOnlineStatus();
  useEffect(() => {
    if (!online) return;
    const { lastSyncedAt } = useOfflineSyncStore.getState();
    if (!lastSyncedAt || Date.now() - new Date(lastSyncedAt).getTime() > AUTO_SYNC_EVERY) void runOfflineSync();
  }, [online]);
}
