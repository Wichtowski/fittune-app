import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/**
 * Whether fittune-api answers, as opposed to whether the device is online. When the device is
 * online but the API does not respond, or responds with a gateway error, the servers are down;
 * the next successful response clears it
 */
let reachable = true;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === reachable) return;
  reachable = next;
  for (const listener of listeners) listener();
}

/**
 * Gateway errors: the proxy answered but FitTune did not. 520-524 are Cloudflare's, which
 * fronts the production API
 */
export function isServerUnavailable(status: number) {
  return status === 502 || status === 503 || status === 504 || (status >= 520 && status <= 524);
}

/** Called by the API client for every request that got a response */
export function reportResponse(status: number) {
  set(!isServerUnavailable(status));
}

/** Called by the API client when a request got no response at all */
export function reportNoResponse() {
  // Offline is its own state; only an online device failing to reach the API means it is down
  if (onlineManager.isOnline()) set(false);
}

export function useApiReachable(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => reachable,
    () => true,
  );
}
