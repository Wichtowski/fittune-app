import { Link } from "@tanstack/react-router";
import { CloudOffIcon, TriangleAlertIcon } from "lucide-react";

import { ApiError } from "@/api/client";
import { isServerUnavailable } from "@/api/reachability";
import { Button } from "@/components/ui/button";
import { useOfflineSyncStore } from "@/features/offline/store";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { formatAgo } from "@/lib/format";

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && (error.isNetworkError || isServerUnavailable(error.status));
  const Icon = offline ? CloudOffIcon : TriangleAlertIcon;
  const online = useOnlineStatus();
  const lastSyncedAt = useOfflineSyncStore((state) => state.lastSyncedAt);
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border px-6 py-8 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        {offline
          ? `This isn't saved on this device yet${online ? " and FitTune's servers can't be reached" : ""}. ${
              lastSyncedAt ? `Last synced ${formatAgo(lastSyncedAt)}; it` : "It"
            } will be available offline after the next sync.`
          : error instanceof Error
            ? error.message
            : "Something went wrong."}
      </p>
      {offline ? (
        <Link to="/profile" className="text-sm font-medium text-primary-strong underline-offset-4 hover:underline">
          Offline data settings
        </Link>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
