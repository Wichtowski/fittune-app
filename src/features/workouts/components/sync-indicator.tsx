import { t } from "@/lib/i18n";
import { CloudCheckIcon, CloudOffIcon, CloudUploadIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { useWorkoutStore } from "../store";
import { useSyncStatus } from "../use-workout-sync";
import { cn } from "@/lib/utils";

const copy = {
  synced: { icon: CloudCheckIcon, label: "Saved" },
  saving: { icon: CloudUploadIcon, label: "Saving…" },
  pending: { icon: CloudUploadIcon, label: "Waiting to save" },
  offline: { icon: CloudOffIcon, label: "Offline - saved on this device" },
  error: { icon: TriangleAlertIcon, label: "Not saved" },
} as const;

/** Compact save state for workouts; never blocks the user, only informs. */
export function SyncIndicator({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { status, error, failedId } = useSyncStatus();
  const retry = useWorkoutStore((state) => state.retry);
  const { icon: Icon, label } = copy[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        status === "error" ? "text-destructive" : status === "offline" ? "text-endurance-strong" : "text-muted-foreground",
        className,
      )}
      title={error ? t(error) : t(label)}
    >
      <Icon className={cn("size-4", status === "saving" && "animate-pulse")} aria-hidden />
      <span className={cn(compact && "sr-only")}>{status === "error" && error ? t(error) : t(label)}</span>
      {status === "error" && failedId ? (
        <button
          type="button"
          onClick={() => retry(failedId)}
          className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 underline-offset-2 hover:underline"
        >
          <RefreshCwIcon className="size-3.5" aria-hidden />{" "}{t("Retry")}{" "}</button>
      ) : null}
    </div>
  );
}
