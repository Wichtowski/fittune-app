import { t } from "@/lib/i18n";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect } from "react";
import { toast } from "sonner";

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
      if (!registration) return;
      // Check for updates hourly while the app stays open.
      window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast(t("A new version of FitTune is ready"), {
      id: "pwa-update",
      duration: Number.POSITIVE_INFINITY,
      action: { label: t("Update"), onClick: () => void updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
