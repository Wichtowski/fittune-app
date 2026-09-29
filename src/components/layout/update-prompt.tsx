import { t } from "@/lib/i18n";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect } from "react";
import { toast } from "sonner";

import { applyUpdate, watchForUpdates } from "@/features/pwa/updates";

/**
 * Registers the service worker and offers new versions as a toast instead of reloading on
 * its own - an automatic reload in the middle of a set would be hostile
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Lives as long as the app, so the checks are never cleaned up
      if (registration) watchForUpdates(registration);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast(t("A new version of FitTune is ready"), {
      id: "pwa-update",
      duration: Number.POSITIVE_INFINITY,
      action: { label: t("Update"), onClick: () => applyUpdate(updateServiceWorker) },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
