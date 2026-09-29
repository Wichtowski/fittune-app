import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const dismissedAtKey = "fittune_install_prompt_dismissed_at";
const dismissDuration = 24 * 60 * 60 * 1_000;

function dismissalTimeRemaining() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(dismissedAtKey));
    return Number.isFinite(dismissedAt) ? Math.max(0, dismissDuration - (Date.now() - dismissedAt)) : 0;
  } catch {
    return 0;
  }
}

export function InstallPrompt() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => dismissalTimeRemaining() > 0);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 560px)").matches);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 560px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!dismissed) return;
    const timeout = window.setTimeout(() => setDismissed(false), dismissalTimeRemaining());
    return () => window.clearTimeout(timeout);
  }, [dismissed]);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissedAtKey, String(Date.now()));
    } catch {
      // Keep the dismissal for this session if storage is unavailable.
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "dismissed") dismiss();
  };

  if (!installEvent || dismissed || !isMobile || pathname !== "/profile") return null;

  return (
    <aside
      aria-label="Install FitTune"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-2xl"
    >
      <strong className="block font-display text-xl">Take FitTune with you</strong>
      <p className="mt-1 text-sm text-muted-foreground">Install FitTune for quick access from your home screen.</p>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => void install()} type="button">Install</Button>
        <Button aria-label="Dismiss install prompt" className="flex-1" onClick={dismiss} type="button" variant="outline">
          Not now
        </Button>
      </div>
    </aside>
  );
}
