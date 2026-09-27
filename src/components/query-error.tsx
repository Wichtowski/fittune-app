import { CloudOffIcon, TriangleAlertIcon } from "lucide-react";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.isNetworkError;
  const Icon = offline ? CloudOffIcon : TriangleAlertIcon;
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border px-6 py-8 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        {offline
          ? "You're offline and this hasn't been loaded on this device yet."
          : error instanceof Error
            ? error.message
            : "Something went wrong."}
      </p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
