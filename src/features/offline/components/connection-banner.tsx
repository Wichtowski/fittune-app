import { Link } from "@tanstack/react-router";
import { CloudOffIcon, PlaneIcon, ServerCrashIcon } from "lucide-react";
import { t } from "@/lib/i18n";

import { type OfflineReason, useOffline } from "@/lib/connectivity";

const copy: Record<OfflineReason, { icon: typeof CloudOffIcon; title: string; body: string }> = {
  device: {
    icon: CloudOffIcon,
    title: "You're offline.",
    body: "Workouts you log are saved on this device and sync when you're back online.",
  },
  manual: {
    icon: PlaneIcon,
    title: "Offline mode is on.",
    body: "FitTune won't use the network; workouts you log are saved on this device and sync when you turn it off.",
  },
  server: {
    icon: ServerCrashIcon,
    title: "FitTune's servers are unavailable right now.",
    body: "You can keep using the app offline; workouts you log are saved on this device and sync once we're back.",
  },
};

/** Explains, once and app-wide, why data may not refresh, and that logging keeps working */
export function ConnectionBanner({ className = "" }: { className?: string }) {
  const { reason } = useOffline();
  if (!reason) return null;

  const { icon: Icon, title, body } = copy[reason];
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl border border-endurance/40 bg-endurance/10 p-3 text-sm ${className}`}>
      <Icon className="mt-0.5 size-5 shrink-0 text-endurance-strong" aria-hidden />
      <p>
        <span className="font-medium">{t(title)}</span> {t(body)}
        {reason === "manual" ? (
          <>
            {" "}
            <Link to="/profile" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              {t("Turn it off in Profile")}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
