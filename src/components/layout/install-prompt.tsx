import { useRouterState } from "@tanstack/react-router";
import { PlusSquareIcon, ShareIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { currentEnvironment, installMethod } from "@/features/pwa/install";
import { t } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import { toast } from "sonner";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const dismissedAtKey = "fittune_install_prompt_dismissed_at";
const dismissDuration = 24 * 60 * 60 * 1_000;
/** The apps' home screens, where the suggestion does not get in the way of logging */
const SHOWN_ON = new Set(["/train", "/health"]);

function dismissalTimeRemaining() {
  const dismissedAt = Number(storage.getItem(dismissedAtKey));
  return Number.isFinite(dismissedAt) ? Math.max(0, dismissDuration - (Date.now() - dismissedAt)) : 0;
}

/**
 * Suggests installing the app: the browser's own prompt where it has one (Chrome, Android),
 * and the Share → Add to Home Screen steps on iOS, which has no install prompt at all
 */
export function InstallPrompt() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => dismissalTimeRemaining() > 0);

  useEffect(() => {
    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!dismissed) return;
    const timeout = window.setTimeout(() => setDismissed(false), dismissalTimeRemaining());
    return () => window.clearTimeout(timeout);
  }, [dismissed]);

  const dismiss = () => {
    setDismissed(true);
    storage.setItem(dismissedAtKey, String(Date.now()));
  };

  const install = async () => {
    if (!installEvent) return;
    setInstallEvent(null);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "dismissed") dismiss();
    } catch {
      toast.error(t("Could not install. Try again."));
    }
  };

  const method = installed ? null : installMethod(currentEnvironment(installEvent !== null));
  if (!method || dismissed || !SHOWN_ON.has(pathname)) return null;

  return (
    <aside
      aria-label={t("Install FitTune")}
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm"
    >
      <strong className="block font-display text-xl uppercase">{t("Take FitTune with you")}</strong>
      {method === "ios" ? (
        <ol className="mt-2 grid gap-2 text-sm">
          <li className="flex items-center gap-2">
            <ShareIcon className="size-5 shrink-0 text-primary-strong" aria-hidden />
            <span>{t("Tap Share in the browser bar")}</span>
          </li>
          <li className="flex items-center gap-2">
            <PlusSquareIcon className="size-5 shrink-0 text-primary-strong" aria-hidden />
            <span>{t("Choose “Add to Home Screen”")}</span>
          </li>
        </ol>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{t("Install FitTune for quick access from your home screen.")}</p>
      )}
      <div className="mt-4 flex gap-2">
        {method === "prompt" ? (
          <Button className="flex-1" onClick={() => void install()} type="button">{t("Install")}</Button>
        ) : null}
        <Button aria-label={t("Dismiss install suggestion")} className="flex-1" onClick={dismiss} type="button" variant="outline">
          {method === "ios" ? t("Got it") : t("Not now")}
        </Button>
      </div>
    </aside>
  );
}
