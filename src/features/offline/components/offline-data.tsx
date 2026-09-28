import { RefreshCwIcon } from "lucide-react";

import { useOfflineSyncStore } from "../store";
import { OFFLINE_WORKOUTS } from "../sync";
import { runOfflineSync } from "../use-offline-sync";
import { useApiReachable } from "@/api/reachability";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { formatAgo } from "@/lib/format";

/** Profile section: what is available offline, when it was last downloaded, and a manual sync */
export function OfflineData() {
  const { status, lastSyncedAt, error } = useOfflineSyncStore();
  const online = useOnlineStatus();
  const reachable = useApiReachable();
  const syncing = status === "syncing";

  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted-foreground">
        FitTune keeps your exercises, routines, places and last {OFFLINE_WORKOUTS} workouts on this device so they work
        without a connection. It syncs automatically when you open the app online.
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="grid min-w-0 gap-1" aria-live="polite">
          <p>
            {syncing
              ? "Syncing…"
              : lastSyncedAt
                ? `Last synced ${formatAgo(lastSyncedAt)}.`
                : "Not synced on this device yet. Sync before you train somewhere without signal."}
          </p>
          {error && !syncing && online && reachable ? <p className="text-destructive">{error}</p> : null}
          {!online ? (
            <p className="text-muted-foreground">Connect to the internet to sync.</p>
          ) : !reachable ? (
            <p className="text-muted-foreground">FitTune's servers are unavailable; try again later.</p>
          ) : null}
        </div>
        <Button variant="secondary" className="shrink-0" disabled={!online || syncing} onClick={() => void runOfflineSync()}>
          <RefreshCwIcon className={syncing ? "size-4 animate-spin" : "size-4"} aria-hidden /> {syncing ? "Syncing…" : "Sync now"}
        </Button>
      </div>
    </div>
  );
}
