export type InstallMethod = "prompt" | "ios";

type Environment = {
  userAgent: string;
  maxTouchPoints: number;
  /** Already running from the home screen */
  standalone: boolean;
  /** The browser handed over its own install prompt (`beforeinstallprompt`) */
  hasInstallEvent: boolean;
};

/**
 * How this browser installs the app, if at all. iOS has no install prompt event: web apps are
 * added from the Share menu, so the app has to explain it. iPads in desktop mode report a Mac
 * user agent, touch support tells them apart from real Macs
 */
export function installMethod({ userAgent, maxTouchPoints, standalone, hasInstallEvent }: Environment): InstallMethod | null {
  if (standalone) return null;
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (ios) return "ios";
  return hasInstallEvent ? "prompt" : null;
}

export function currentEnvironment(hasInstallEvent: boolean): Environment {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hasInstallEvent,
  };
}
