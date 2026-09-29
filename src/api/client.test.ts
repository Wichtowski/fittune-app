import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { account } from "./account";
import { ApiClient, configureApiClient } from "./client";
import { fittune } from "./fittune";
import { API_BASE_URL } from "@/lib/env";

const onUnauthorized = vi.fn();

class HealthTestClient extends ApiClient {
  constructor() {
    super("/health");
  }

  getDiary() {
    return this.request("/diary");
  }
}

const health = new HealthTestClient();

function answer(status: number, body: unknown) {
  return vi.fn((_url: URL, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

beforeEach(() => {
  configureApiClient({ getToken: () => "token-1", onUnauthorized });
});

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized.mockReset();
  configureApiClient({ getToken: () => null, onUnauthorized: () => {} });
});

describe("ApiClient", () => {
  it("namespaces health calls and signs out through the shared session on a 401", async () => {
    const fetch = answer(401, { code: "unauthorized", message: "Session expired" });
    vi.stubGlobal("fetch", fetch);

    await expect(health.getDiary()).rejects.toMatchObject({ status: 401 });

    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${API_BASE_URL}/api/v1/health/diary`);
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer token-1" });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("sends training calls under /train and account calls at the root", async () => {
    const fetch = answer(200, []);
    vi.stubGlobal("fetch", fetch);

    await fittune.getRoutines();
    await account.getBlocks();

    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${API_BASE_URL}/api/v1/train/routines`);
    expect(String(fetch.mock.calls[1]?.[0])).toBe(`${API_BASE_URL}/api/v1/blocks`);
  });

  it("uses the one shared session for every client", async () => {
    const fetch = answer(200, []);
    vi.stubGlobal("fetch", fetch);

    await fittune.getPlaces();

    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
  });

  it("signs out on a 401 from a training call like from an account call", async () => {
    vi.stubGlobal("fetch", answer(401, { code: "unauthorized", message: "Session expired" }));

    await expect(fittune.getRoutines()).rejects.toMatchObject({ status: 401 });
    await expect(account.getBlocks()).rejects.toMatchObject({ status: 401 });

    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });
});
