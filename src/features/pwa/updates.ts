/** Long sessions still hear about new versions */
const HOURLY = 60 * 60 * 1000;
/** Time for the new version to take over before reloading anyway */
const TAKEOVER_TIMEOUT_MS = 2000;

/**
 * Asks the server for a new app version now, whenever the app comes back to the foreground or
 * online, and hourly. An installed app on iOS resumes instead of reloading, so without the
 * foreground check it would learn about a new version only much later. Returns a cleanup
 */
export function watchForUpdates(registration: ServiceWorkerRegistration): () => void {
  const check = () => {
    if (navigator.onLine === false) return;
    // A failed check (offline, server down) is simply retried by the next one
    registration.update().catch(() => {});
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };

  check();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", check);
  const timer = window.setInterval(check, HOURLY);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", check);
    window.clearInterval(timer);
  };
}

/**
 * Switches to the waiting version. The page normally reloads once it takes over, but iOS
 * sometimes never reports the takeover, so it reloads itself after a moment regardless
 */
export function applyUpdate(activate: (reload: boolean) => Promise<void>, reload: () => void = () => window.location.reload()) {
  window.setTimeout(reload, TAKEOVER_TIMEOUT_MS);
  void activate(true);
}
