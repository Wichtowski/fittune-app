import type { z } from "zod";

import { apiUrl, ApiError, authToken, type RequestOptions, reportUnauthorized, send } from "./transport";
import { reportNoResponse, reportResponse } from "@/lib/connectivity";

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

  protected unauthorized(token: string) {
    reportUnauthorized(token);
  }

  /** A private image, fetched with the session since `<img src>` cannot send it */
  protected async imageBlob(path: string): Promise<Blob> {
    const token = this.token();
    if (!token) throw new ApiError(401, "unauthorized", "Sign in to view photos.");
    let response: Response;
    try {
      response = await fetch(this.url(path), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    } catch {
      reportNoResponse();
      throw new ApiError(0, "network_error", "Photo unavailable while offline.");
    }
    reportResponse(response.status);
    if (response.status === 401) this.unauthorized(token);
    if (!response.ok) throw new ApiError(response.status, "photo_unavailable", "Could not load photo.");
    return response.blob();
  }
}
