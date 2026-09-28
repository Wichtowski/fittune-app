import { onlineManager } from "@tanstack/react-query";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { offlineReason, reportNoResponse, reportResponse, startConnectivity, useConnectivity } from "./connectivity";

beforeAll(() => startConnectivity());

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useConnectivity.setState({ deviceOnline: true, manualOffline: false, apiDown: false });
});

describe("connectivity", () => {
  it("explains being offline by the device first, then offline mode, then the servers", () => {
    expect(offlineReason({ deviceOnline: false, manualOffline: true, apiDown: true })).toBe("device");
    expect(offlineReason({ deviceOnline: true, manualOffline: true, apiDown: true })).toBe("manual");
    expect(offlineReason({ deviceOnline: true, manualOffline: false, apiDown: true })).toBe("server");
    expect(offlineReason({ deviceOnline: true, manualOffline: false, apiDown: false })).toBeNull();
  });

  it("takes the whole app offline when the API stops answering, instead of retrying against it", () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    reportNoResponse();
    expect(useConnectivity.getState().apiDown).toBe(true);
    expect(onlineManager.isOnline()).toBe(false);
    reportResponse(200);
    expect(onlineManager.isOnline()).toBe(true);
    reportResponse(522);
    expect(useConnectivity.getState().apiDown).toBe(true);
  });

  it("does not blame the servers when the device itself is offline or in offline mode", () => {
    useConnectivity.setState({ deviceOnline: false });
    reportNoResponse();
    useConnectivity.setState({ deviceOnline: true, manualOffline: true });
    reportNoResponse();
    expect(useConnectivity.getState().apiDown).toBe(false);
    expect(onlineManager.isOnline()).toBe(false);
  });

  it("comes back online by itself once the health check answers", async () => {
    vi.useFakeTimers();
    const health = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", health);
    reportNoResponse();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(useConnectivity.getState().apiDown).toBe(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(useConnectivity.getState().apiDown).toBe(false);
    expect(onlineManager.isOnline()).toBe(true);
    expect(health).toHaveBeenCalledTimes(2);
  });

  it("goes offline while offline mode is on", () => {
    useConnectivity.getState().setManualOffline(true);
    expect(onlineManager.isOnline()).toBe(false);
    useConnectivity.getState().setManualOffline(false);
    expect(onlineManager.isOnline()).toBe(true);
  });
});
