import { afterEach, describe, expect, it, vi } from "vitest";

import { applyUpdate, watchForUpdates } from "./updates";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function registration() {
  return { update: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerRegistration & { update: ReturnType<typeof vi.fn> };
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("watchForUpdates", () => {
  it("checks at once, so an outdated app hears about it on launch", () => {
    const reg = registration();
    const stop = watchForUpdates(reg);
    expect(reg.update).toHaveBeenCalledTimes(1);
    stop();
  });

  it("checks again whenever the app comes back to the foreground", () => {
    const reg = registration();
    const stop = watchForUpdates(reg);
    setVisibility("hidden");
    setVisibility("visible");
    expect(reg.update).toHaveBeenCalledTimes(2);
    stop();
  });

  it("checks when the connection returns and every hour while open", () => {
    vi.useFakeTimers();
    const reg = registration();
    const stop = watchForUpdates(reg);
    window.dispatchEvent(new Event("online"));
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(reg.update).toHaveBeenCalledTimes(3);
    stop();
  });

  it("does not check while offline and stops when asked", () => {
    const reg = registration();
    vi.stubGlobal("navigator", { onLine: false });
    const stop = watchForUpdates(reg);
    expect(reg.update).not.toHaveBeenCalled();
    stop();
    setVisibility("visible");
    expect(reg.update).not.toHaveBeenCalled();
  });

  it("ignores a failed check, the next one retries", async () => {
    const reg = registration();
    reg.update.mockRejectedValue(new Error("offline"));
    const stop = watchForUpdates(reg);
    await Promise.resolve();
    stop();
    expect(reg.update).toHaveBeenCalledTimes(1);
  });
});

describe("applyUpdate", () => {
  it("recovers from an activation failure through the reload timer", async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    applyUpdate(vi.fn().mockRejectedValue(new Error("activation failed")), reload);
    await vi.advanceTimersByTimeAsync(2000);
    expect(reload).toHaveBeenCalledOnce();
  });
  it("reloads itself when the new version never takes over", async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    const activate = vi.fn(() => new Promise<void>(() => {}));
    applyUpdate(activate, reload);
    expect(activate).toHaveBeenCalledWith(true);
    vi.advanceTimersByTime(1999);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
