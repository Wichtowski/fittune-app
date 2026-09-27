import type { z } from "zod";

import { API_BASE_URL } from "@/lib/env";

/** Error returned by fittune-api (`{ code, message, fields }`) or raised for network failures. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** No response at all: offline, DNS, CORS, server down. Safe to retry later. */
  get isNetworkError() {
    return this.status === 0;
  }

  get isRetryable() {
    return this.isNetworkError || this.status >= 500 || this.status === 408 || this.status === 429;
  }
}

type ClientHooks = {
  getToken: () => string | null;
  onUnauthorized: () => void;
};

let hooks: ClientHooks = { getToken: () => null, onUnauthorized: () => {} };

/** Wires authentication into the client without the API layer importing app state. */
export function configureApiClient(next: ClientHooks) {
  hooks = next;
}

type RequestOptions<T extends z.ZodType | undefined> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  schema?: T;
  signal?: AbortSignal;
  /** Skip the Authorization header (login/register). */
  anonymous?: boolean;
};

export async function request<T extends z.ZodType | undefined = undefined>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T extends z.ZodType ? z.infer<T> : void> {
  const url = new URL(`${API_BASE_URL}/api/v1${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const token = options.anonymous ? null : hooks.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network_error", "Can't reach FitTune right now. Check your connection.");
  }

  if (response.status === 401 && token) hooks.onUnauthorized();

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
      fields?: Record<string, string>;
    } | null;
    throw new ApiError(
      response.status,
      body?.code ?? "http_error",
      body?.message ?? `Request failed (${response.status})`,
      body?.fields ?? {},
    );
  }

  if (response.status === 204 || !options.schema) {
    return undefined as T extends z.ZodType ? z.infer<T> : void;
  }
  const json: unknown = await response.json();
  const parsed = options.schema.safeParse(json);
  if (!parsed.success) {
    console.error("Unexpected API response", path, parsed.error.issues);
    throw new ApiError(response.status, "invalid_response", "The server sent an unexpected response.");
  }
  return parsed.data as T extends z.ZodType ? z.infer<T> : void;
}
