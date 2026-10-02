import { afterEach, describe, expect, it, vi } from "vitest";

import { useConnectivity } from "@/lib/connectivity";
import { z } from "zod";

import { configureApiClient, REQUEST_TIMEOUT_MS, send } from "./transport";

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
  configureApiClient({ getToken: () => null, onUnauthorized: () => {} });
  useConnectivity.setState({ apiDown: false });
});

describe("send", () => {
  it("keeps the product draft mounted when an optional OCR service fails", async () => {
    useConnectivity.setState({ deviceOnline: true, manualOffline: false, apiDown: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
    await expect(send("/health/ocr/rapid", { trackConnectivity: false })).rejects.toMatchObject({ status: 503 });
    expect(useConnectivity.getState().apiDown).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
    await expect(send("/health/ocr/ai", { trackConnectivity: false })).rejects.toMatchObject({ code: "network_error" });
    expect(useConnectivity.getState().apiDown).toBe(false);
  });
  it("sends multipart without a JSON header and exposes retry delay", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Busy" }), { status: 429, headers: { "Retry-After": "60" } }));
    vi.stubGlobal("fetch", fetch);
    const body = new FormData();
    body.append("file", new Blob(["crop"]), "label.jpg");
    await expect(send("/health/ocr/ai", { method: "POST", body, timeoutMs: 30_000 })).rejects.toMatchObject({ status: 429, retryAfter: 60 });
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBe(body);
    expect(request.headers).not.toHaveProperty("Content-Type");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([200, 503])("keeps the timeout active while a %s response body is downloading", async (status) => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: URL, init?: RequestInit) => Promise.resolve(new Response(new ReadableStream({
      start(controller) {
        init?.signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")));
      },
    }), { status }))));
    const pending = send("/me", { schema: z.object({ id: z.string() }) });
    const assertion = expect(pending).rejects.toMatchObject({ status: 0, code: "timeout" });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
  });

  it("does not sign out a new session when an old request returns 401", async () => {
    let token = "old-session";
    const onUnauthorized = vi.fn();
    configureApiClient({ getToken: () => token, onUnauthorized });
    let answer!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { answer = resolve; })));
    const pending = send("/me");
    token = "new-session";
    answer(new Response(null, { status: 401 }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("gives up on a server that does not answer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());
    const pending = send("/me");
    const assertion = expect(pending).rejects.toMatchObject({ status: 0, code: "timeout" });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
  });

  it("passes a caller's abort through untouched", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const pending = send("/me", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
