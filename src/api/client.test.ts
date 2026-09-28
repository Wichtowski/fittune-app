import { afterEach, describe, expect, it, vi } from "vitest";

import { REQUEST_TIMEOUT_MS, request } from "./client";

/** A fetch that never answers, like a server that accepted the connection and hung */
function hangingFetch() {
  return vi.fn(
    (_url: URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("gives up on a server that does not answer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());
    const pending = request("/me");
    const assertion = expect(pending).rejects.toMatchObject({ status: 0, code: "timeout" });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
  });

  it("passes a caller's abort through untouched", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const pending = request("/me", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
