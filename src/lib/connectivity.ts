import { onlineManager } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { API_BASE_URL } from "@/lib/env";
import { storage } from "@/lib/storage";

/**
 * Whether the app should use the network, and if not, why. The app is offline when the device
 * is, when the user turned on offline mode, or when the API stopped answering. This drives
 * TanStack Query's online state, so queries, queued mutations and workout uploads all pause
 * together instead of retrying against a dead server, and resume on their own afterwards
 */
export type OfflineReason = "device" | "manual" | "server";

type ConnectivityState = {
  deviceOnline: boolean;
  /** Offline mode chosen in Profile; kept across reloads */
  manualOffline: boolean;
  /** The API did not answer, or answered through a gateway error; cleared by a health probe */
  apiDown: boolean;
  setManualOffline: (offline: boolean) => void;
};

export const useConnectivity = create<ConnectivityState>()(
  persist(
    (set) => ({
      deviceOnline: typeof navigator === "undefined" ? true : navigator.onLine,
      manualOffline: false,
      apiDown: false,
      setManualOffline: (manualOffline) => set({ manualOffline }),
    }),
    {
      name: "fittune.connectivity",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ manualOffline: state.manualOffline }),
    },
  ),
);

export function offlineReason(state: Pick<ConnectivityState, "deviceOnline" | "manualOffline" | "apiDown">): OfflineReason | null {
  if (!state.deviceOnline) return "device";
  if (state.manualOffline) return "manual";
  if (state.apiDown) return "server";
  return null;
}

/** Offline state for components, with the reason to explain it and the Profile switch */
export function useOffline() {
  const reason = useConnectivity(offlineReason);
  const manualOffline = useConnectivity((state) => state.manualOffline);
  const setManualOffline = useConnectivity((state) => state.setManualOffline);
  return { offline: reason !== null, reason, manualOffline, setManualOffline };
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
  if (isServerUnavailable(status)) markApiDown();
  else if (useConnectivity.getState().apiDown) useConnectivity.setState({ apiDown: false });
}

/** Called by the API client when a request got no response at all */
export function reportNoResponse() {
  // Without a network, or in offline mode, a failed request says nothing about the servers
  if (offlineReason(useConnectivity.getState()) === null) markApiDown();
}

function markApiDown() {
  if (!useConnectivity.getState().apiDown) useConnectivity.setState({ apiDown: true });
}

const PROBE_DELAYS_MS = [5_000, 10_000, 20_000, 30_000];
const PROBE_TIMEOUT_MS = 10_000;

/** Whether the API answers its health check, outside the query client so it runs while paused */
async function probeHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal, cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let started = false;

/** Wires device events, offline mode and API health into TanStack Query. Call once at startup */
export function startConnectivity() {
  if (started || typeof window === "undefined") return;
  started = true;

  const setDevice = () => useConnectivity.setState({ deviceOnline: navigator.onLine });
  window.addEventListener("online", setDevice);
  window.addEventListener("offline", setDevice);

  onlineManager.setEventListener((setOnline) => {
    const apply = () => setOnline(offlineReason(useConnectivity.getState()) === null);
    apply();
    return useConnectivity.subscribe(apply);
  });

  // While the API is down, probe it with growing gaps and come back online when it answers
  let probe: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  const schedule = () => {
    const state = useConnectivity.getState();
    const shouldProbe = state.apiDown && state.deviceOnline && !state.manualOffline;
    if (!shouldProbe) {
      clearTimeout(probe);
      probe = undefined;
      attempt = 0;
      return;
    }
    if (probe) return;
    const delay = PROBE_DELAYS_MS[Math.min(attempt, PROBE_DELAYS_MS.length - 1)];
    probe = setTimeout(async () => {
      attempt++;
      const healthy = await probeHealth();
      probe = undefined;
      if (healthy) useConnectivity.setState({ apiDown: false });
      else schedule();
    }, delay);
  };
  useConnectivity.subscribe(schedule);
  schedule();
}
