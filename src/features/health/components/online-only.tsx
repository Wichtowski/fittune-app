import { Link } from "@tanstack/react-router";
import { CloudOffIcon, PlaneIcon, ServerCrashIcon } from "lucide-react";
import type * as React from "react";

import { type OfflineReason, useOffline } from "@/lib/connectivity";
import { t } from "@/lib/i18n";

const copy: Record<OfflineReason, { icon: typeof CloudOffIcon; title: string; body: string }> = {
  device: {
    icon: CloudOffIcon,
    title: "FitHealth needs a connection",
    body: "Nutrition data lives on our servers. FitTune keeps working offline in the meantime.",
  },
  manual: {
    icon: PlaneIcon,
    title: "FitHealth needs a connection",
    body: "Offline mode is on, so FitHealth can't reach our servers. FitTune keeps working offline.",
  },
  server: {
    icon: ServerCrashIcon,
    title: "FitHealth's servers are unavailable right now",
    body: "Try again in a moment. FitTune keeps working offline in the meantime.",
  },
};

/**
 * FitHealth has no offline mode: without the API it shows why instead of empty or stale
 * screens, and the page comes back on its own once the connection does
 */
export function OnlineOnly({ children }: { children: React.ReactNode }) {
  const { reason } = useOffline();
  if (!reason) return children;

  const { icon: Icon, title, body } = copy[reason];
  return (
    <div role="status" className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon className="size-10 text-muted-foreground" aria-hidden />
      <p className="font-display text-2xl font-bold tracking-wide uppercase">{t(title)}</p>
      <p className="max-w-sm text-muted-foreground">{t(body)}</p>
      {reason === "manual" ? (
        <Link to="/profile" className="font-medium text-primary-strong underline-offset-4 hover:underline">
          {t("Turn it off in Profile")}
        </Link>
      ) : null}
    </div>
  );
}
