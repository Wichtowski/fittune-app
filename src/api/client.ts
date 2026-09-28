import type { z } from "zod";

import { apiUrl, authToken, type RequestOptions, reportUnauthorized, send } from "./transport";

export { ApiError, configureApiClient, REQUEST_TIMEOUT_MS } from "./transport";

/** Where a client's endpoints live under `/api/v1`: shared account routes or one app's */
export type ApiNamespace = "" | "/train" | "/health";

/**
 * Base for the per-app clients. It owns the namespace and nothing else, the transport and the
 * shared session live in `transport.ts`
 */
export abstract class ApiClient {
  protected constructor(private readonly namespace: ApiNamespace) {}

  protected request<T extends z.ZodType | undefined = undefined>(path: string, options: RequestOptions<T> = {}) {
    return send(`${this.namespace}${path}`, options);
  }

  /** For uploads and downloads that need XHR or a raw `fetch` */
  protected url(path: string) {
    return apiUrl(`${this.namespace}${path}`);
  }

  protected token() {
    return authToken();
  }

  protected unauthorized() {
    reportUnauthorized();
  }
}
