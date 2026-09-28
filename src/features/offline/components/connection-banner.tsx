import { CloudOffIcon, ServerCrashIcon } from "lucide-react";

import { useApiReachable } from "@/api/reachability";
import { useOnlineStatus } from "@/hooks/use-online-status";

/** Explains, once and app-wide, why data may not refresh, and that logging keeps working */
export function ConnectionBanner() {
  const online = useOnlineStatus();
  const reachable = useApiReachable();
  if (online && reachable) return null;

  const Icon = online ? ServerCrashIcon : CloudOffIcon;
  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-endurance/40 bg-endurance/10 p-3 text-sm">
      <Icon className="mt-0.5 size-5 shrink-0 text-endurance-strong" aria-hidden />
      <p>
        {online ? (
          <><span className="font-medium">FitTune's servers are unavailable right now.</span> You can keep using the app offline; workouts you log are saved on this device and sync once we're back.</>
        ) : (
          <><span className="font-medium">You're offline.</span> Workouts you log are saved on this device and sync when you're back online.</>
        )}
      </p>
    </div>
  );
}
