import { t } from "@/lib/i18n";
import { RefreshCwIcon } from "lucide-react";

import { useOfflineSyncStore } from "../store";
import { OFFLINE_WORKOUTS } from "../sync";
import { runOfflineSync } from "../use-offline-sync";
import { Button } from "@/components/ui/button";
import { type OfflineReason, useOffline } from "@/lib/connectivity";
import { formatAgo } from "@/lib/format";

const cannotSync: Record<OfflineReason, string> = {
  device: "Connect to the internet to sync.",
  manual: "Turn off offline mode to sync.",
  server: "FitTune's servers are unavailable; try again later.",
};

/** Profile section: offline mode, when data was last downloaded, and a manual sync */
export function OfflineData() {
  const { status, lastSyncedAt, error } = useOfflineSyncStore();
  const { reason, manualOffline, setManualOffline } = useOffline();
  const syncing = status === "syncing";

  return (
    <div className="grid gap-4 text-sm">
      <label className="flex cursor-pointer items-start justify-between gap-3">
        <span className="grid gap-1">
          <span className="font-medium">{t("Offline mode")}</span>
          <span className="text-muted-foreground">
            {t("Use FitTune without the network, for example with a weak signal at the gym. Workouts are saved on this device and sync when you turn it off. It also turns on by itself while FitTune's servers are unavailable.")}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={manualOffline}
          onChange={(event) => setManualOffline(event.target.checked)}
          className="mt-1 size-5 shrink-0 accent-primary"
        />
      </label>

      <p className="text-muted-foreground">
        {t("FitTune keeps your exercises, routines, places and last {count} workouts on this device so they work without a connection. It syncs automatically whenever it is online.", { count: OFFLINE_WORKOUTS })}
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="grid min-w-0 gap-1" aria-live="polite">
          <p>
            {syncing
              ? t("Syncing…")
              : lastSyncedAt
                ? t("Last synced {when}.", { when: formatAgo(lastSyncedAt) })
                : t("Not synced on this device yet. Sync before you train somewhere without signal.")}
          </p>
          {reason ? (
            <p className="text-muted-foreground">{t(cannotSync[reason])}</p>
          ) : error && !syncing ? (
            <p className="text-destructive">{error}</p>
          ) : null}
        </div>
        <Button variant="secondary" className="shrink-0" disabled={reason !== null || syncing} onClick={() => void runOfflineSync()}>
          <RefreshCwIcon className={syncing ? "size-4 animate-spin" : "size-4"} aria-hidden /> {syncing ? t("Syncing…") : t("Sync now")}
        </Button>
      </div>
    </div>
  );
}
