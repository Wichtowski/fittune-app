import { type FetchStatus } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CloudOffIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useOfflineSyncStore } from "@/features/offline/store";
import { isServerUnavailable } from "@/lib/connectivity";
import { formatAgo } from "@/lib/format";
import { t } from "@/lib/i18n";

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const unreachable = error instanceof ApiError && (error.isNetworkError || isServerUnavailable(error.status));
  if (unreachable) return <NotAvailableOffline />;

  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border px-6 py-8 text-center">
      <TriangleAlertIcon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{error instanceof Error ? t(error.message) : t("Something went wrong.")}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>{t("Try again")}</Button>
      ) : null}
    </div>
  );
}

/** Data that was never downloaded to this device, while the app cannot reach FitTune */
export function NotAvailableOffline() {
  const lastSyncedAt = useOfflineSyncStore((state) => state.lastSyncedAt);
  return (
    <div role="status" className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center">
      <CloudOffIcon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{t("Not available offline yet")}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {lastSyncedAt ? `${t("Last synced {when}.", { when: formatAgo(lastSyncedAt) })} ` : ""}
        {t("It downloads to this device the next time FitTune is online.")}
      </p>
      <Link to="/profile" className="text-sm font-medium text-primary-strong underline-offset-4 hover:underline">
        {t("Offline data settings")}
      </Link>
    </div>
  );
}

type FallbackQuery = { error: unknown; fetchStatus: FetchStatus; refetch: () => unknown };

/**
 * What to show while a query has no data: its skeleton while it loads, why it cannot load
 * while the app is offline (a paused query would otherwise show the skeleton forever), and
 * the error once it failed
 */
export function QueryFallback({ query, className, children }: { query: FallbackQuery; className?: string; children: ReactNode }) {
  if (query.error) {
    return (
      <div className={className}>
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  if (query.fetchStatus === "paused") {
    return (
      <div className={className}>
        <NotAvailableOffline />
      </div>
    );
  }
  return children;
}
