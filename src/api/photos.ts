import { z } from "zod";

import { ApiError, reportUnauthorized, request } from "./client";
import { getToken } from "@/features/auth/session";
import { reportNoResponse, reportResponse } from "@/lib/connectivity";
import { API_BASE_URL } from "@/lib/env";

export const progressPhotoSchema = z.object({
  id: z.guid(),
  workout_id: z.guid().nullable(),
  width: z.number(),
  height: z.number(),
  bytes: z.number(),
  taken_at: z.iso.datetime(),
  created_at: z.iso.datetime(),
});
export type ProgressPhoto = z.infer<typeof progressPhotoSchema>;
const photosSchema = z.array(progressPhotoSchema);

export const listPhotos = (workoutId?: string, offset = 0) =>
  request("/progress-photos", { schema: photosSchema, query: { workout_id: workoutId, limit: 100, offset } });
export const deletePhoto = (id: string) => request(`/progress-photos/${id}`, { method: "DELETE" });

/** The id is kept across retries, so an uncertain response cannot create a second attachment. */
export function uploadPhoto(id: string, file: File, workoutId: string, onProgress: (percent: number) => void): Promise<ProgressPhoto> {
  return new Promise((resolve, reject) => {
    const token = getToken();
    if (!token) { reject(new ApiError(401, "unauthorized", "Sign in to upload a photo.")); return; }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${API_BASE_URL}/api/v1/progress-photos/${id}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.timeout = 60_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => { reportNoResponse(); reject(new ApiError(0, "network_error", "Upload failed. Try again when connected.")); };
    xhr.ontimeout = () => { reportNoResponse(); reject(new ApiError(0, "timeout", "Upload timed out. Try again.")); };
    xhr.onload = () => {
      reportResponse(xhr.status);
      if (xhr.status === 401) reportUnauthorized();
      let body: unknown;
      try { body = JSON.parse(xhr.responseText || "null"); } catch { body = null; }
      if (xhr.status < 200 || xhr.status >= 300) {
        const error = body as { code?: string; message?: string } | null;
        reject(new ApiError(xhr.status, error?.code ?? "http_error", error?.message ?? "Upload failed."));
        return;
      }
      const parsed = progressPhotoSchema.safeParse(body);
      if (!parsed.success) { reject(new ApiError(xhr.status, "invalid_response", "The server sent an unexpected response.")); return; }
      resolve(parsed.data);
    };
    const form = new FormData();
    form.append("workout_id", workoutId);
    form.append("file", file);
    xhr.send(form);
  });
}

export async function photoBlob(id: string, size: "full" | "thumb"): Promise<Blob> {
  const token = getToken();
  if (!token) throw new ApiError(401, "unauthorized", "Sign in to view photos.");
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/progress-photos/${id}/file?size=${size}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
  } catch {
    reportNoResponse();
    throw new ApiError(0, "network_error", "Photo unavailable while offline.");
  }
  reportResponse(response.status);
  if (response.status === 401) reportUnauthorized();
  if (!response.ok) throw new ApiError(response.status, "photo_unavailable", "Could not load photo.");
  return response.blob();
}
