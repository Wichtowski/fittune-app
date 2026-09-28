import { onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";

import { useOfflineSyncStore } from "./store";
import { syncForOffline } from "./sync";
import { ApiError } from "@/api/client";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queryClient } from "@/lib/query-client";
import { t } from "@/lib/i18n";

/** Automatic syncs happen at most this often; the button in Profile can always sync */
const AUTO_SYNC_EVERY = 15 * 60 * 1000;

let current: AbortController | null = null;

/** Downloads data for offline use unless a sync is already running */
export async function runOfflineSync() {
  if (current || !onlineManager.isOnline()) return;
  const run = new AbortController();
  current = run;
  const store = useOfflineSyncStore.getState();
  store.started();
  try {
    const { failed } = await syncForOffline(queryClient, run.signal);
    if (run.signal.aborted) return;
    if (failed > 0) store.failed(t("Items not downloaded: {count}. Try again later.", { count: failed }));
    else store.finished(new Date().toISOString());
  } catch (error) {
    if (run.signal.aborted) return;
    store.failed(error instanceof ApiError && error.isNetworkError ? t("Can't reach FitTune right now.") : t("Sync failed. Try again later."));
  } finally {
    if (current === run) current = null;
    // Whatever happened, a finished run never leaves the button spinning
    if (!run.signal.aborted && useOfflineSyncStore.getState().status === "syncing") useOfflineSyncStore.getState().failed(t("Sync stopped. Try again."));
  }
}

/** Stops a running sync, for sign-out; its results are discarded */
export function stopOfflineSync() {
  current?.abort();
  current = null;
  useOfflineSyncStore.getState().reset();
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
