import { z } from "zod";

import { ApiClient, ApiError } from "./client";
import { reportNoResponse, reportResponse } from "@/lib/connectivity";
import { type ActivityInput, activitySchema } from "@/schemas/activity";
import { type ActivityKind, pageSchema } from "@/schemas/common";
import { exerciseHistorySchema, type ExerciseInput, exerciseSchema } from "@/schemas/exercise";
import { type ProgressPhoto, progressPhotoSchema } from "@/schemas/photo";
import { type PlaceInput, placeSchema } from "@/schemas/place";
import { type RoutineInput, routineSchema } from "@/schemas/routine";
import {
  type Bucket,
  exerciseRecordSchema,
  muscleVolumeSchema,
  overviewSchema,
  type Period,
  timelinePointSchema,
} from "@/schemas/stats";
import { type WorkoutInput, workoutSchema, workoutSummarySchema } from "@/schemas/workout";

const workoutPageSchema = pageSchema(workoutSummarySchema);
const activityPageSchema = pageSchema(activitySchema);

/** FitTune training endpoints under `/api/v1/train`. Arrow fields so they work as `mutationFn` */
class FitTuneClient extends ApiClient {
  constructor() {
    super("/train");
  }

  // Exercises
  getExercises = (signal?: AbortSignal) => this.request("/exercises", { schema: z.array(exerciseSchema), signal });
  getExercise = (id: string, signal?: AbortSignal) => this.request(`/exercises/${id}`, { schema: exerciseSchema, signal });
  getExerciseHistory = (id: string, signal?: AbortSignal) =>
    this.request(`/exercises/${id}/history`, { schema: exerciseHistorySchema, query: { sessions: 50 }, signal });
  createExercise = (input: ExerciseInput) =>
    this.request("/exercises", { method: "POST", body: input, schema: exerciseSchema });
  updateExercise = (id: string, input: ExerciseInput) =>
    this.request(`/exercises/${id}`, { method: "PUT", body: input, schema: exerciseSchema });
  archiveExercise = (id: string) => this.request(`/exercises/${id}`, { method: "DELETE" });

  // Routines
  getRoutines = (signal?: AbortSignal) => this.request("/routines", { schema: z.array(routineSchema), signal });
  getRoutine = (id: string, signal?: AbortSignal) => this.request(`/routines/${id}`, { schema: routineSchema, signal });
  createRoutine = (input: RoutineInput) => this.request("/routines", { method: "POST", body: input, schema: routineSchema });
  updateRoutine = (id: string, input: RoutineInput) =>
    this.request(`/routines/${id}`, { method: "PUT", body: input, schema: routineSchema });
  deleteRoutine = (id: string) => this.request(`/routines/${id}`, { method: "DELETE" });

  // Places
  getPlaces = (signal?: AbortSignal) => this.request("/places", { schema: placeSchema.array(), signal });
  savePlace = (id: string, input: PlaceInput) =>
    this.request(`/places/${id}`, { method: "PUT", body: input, schema: placeSchema });
  archivePlace = (id: string) => this.request(`/places/${id}`, { method: "DELETE" });

  // Workouts
  getWorkoutsPage = (status?: "in_progress" | "completed", cursor?: string, signal?: AbortSignal) =>
    this.request("/workouts", { schema: workoutPageSchema, query: { status, cursor, limit: 20 }, signal });
  getWorkout = (id: string, signal?: AbortSignal) => this.request(`/workouts/${id}`, { schema: workoutSchema, signal });
  putWorkout = (id: string, input: WorkoutInput) =>
    this.request(`/workouts/${id}`, { method: "PUT", body: input, schema: workoutSchema });
  deleteWorkout = (id: string) => this.request(`/workouts/${id}`, { method: "DELETE" });

  // Activities
  getActivitiesPage = (kind: ActivityKind | undefined, cursor: string | undefined, signal?: AbortSignal) =>
    this.request("/activities", { schema: activityPageSchema, query: { kind, cursor, limit: 20 }, signal });
  putActivity = (id: string, input: ActivityInput) =>
    this.request(`/activities/${id}`, { method: "PUT", body: input, schema: activitySchema });
  deleteActivity = (id: string) => this.request(`/activities/${id}`, { method: "DELETE" });

  // Stats
  getOverview = (period: Period, tz: string, signal?: AbortSignal) =>
    this.request("/stats/overview", { schema: overviewSchema, query: { ...period, tz }, signal });
  getTimeline = (period: Period, tz: string, bucket: Bucket, signal?: AbortSignal) =>
    this.request("/stats/timeline", { schema: z.array(timelinePointSchema), query: { ...period, tz, bucket }, signal });
  getMuscles = (period: Period, tz: string, signal?: AbortSignal) =>
    this.request("/stats/muscles", { schema: z.array(muscleVolumeSchema), query: { ...period, tz }, signal });
  getRecords = (signal?: AbortSignal) => this.request("/stats/records", { schema: z.array(exerciseRecordSchema), signal });

  // Progress photos
  listPhotos = (workoutId?: string, offset = 0) =>
    this.request("/progress-photos", {
      schema: z.array(progressPhotoSchema),
      query: { workout_id: workoutId, limit: 100, offset },
    });
  deletePhoto = (id: string) => this.request(`/progress-photos/${id}`, { method: "DELETE" });

  /** The id is kept across retries, so an uncertain response cannot create a second attachment */
  uploadPhoto = (id: string, file: File, workoutId: string, onProgress: (percent: number) => void) =>
    new Promise<ProgressPhoto>((resolve, reject) => {
      const token = this.token();
      if (!token) {
        reject(new ApiError(401, "unauthorized", "Sign in to upload a photo."));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", this.url(`/progress-photos/${id}`));
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.timeout = 60_000;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onerror = () => {
        reportNoResponse();
        reject(new ApiError(0, "network_error", "Upload failed. Try again when connected."));
      };
      xhr.ontimeout = () => {
        reportNoResponse();
        reject(new ApiError(0, "timeout", "Upload timed out. Try again."));
      };
      xhr.onload = () => {
        reportResponse(xhr.status);
        if (xhr.status === 401) this.unauthorized(token);
        let body: unknown;
        try {
          body = JSON.parse(xhr.responseText || "null");
        } catch {
          body = null;
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          const error = body as { code?: string; message?: string } | null;
          reject(new ApiError(xhr.status, error?.code ?? "http_error", error?.message ?? "Upload failed."));
          return;
        }
        const parsed = progressPhotoSchema.safeParse(body);
        if (!parsed.success) {
          reject(new ApiError(xhr.status, "invalid_response", "The server sent an unexpected response."));
          return;
        }
        resolve(parsed.data);
      };
      const form = new FormData();
      form.append("workout_id", workoutId);
      form.append("file", file);
      xhr.send(form);
    });

  photoBlob = async (id: string, size: "full" | "thumb"): Promise<Blob> => {
    const token = this.token();
    if (!token) throw new ApiError(401, "unauthorized", "Sign in to view photos.");
    let response: Response;
    try {
      response = await fetch(this.url(`/progress-photos/${id}/file?size=${size}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      reportNoResponse();
      throw new ApiError(0, "network_error", "Photo unavailable while offline.");
    }
    reportResponse(response.status);
    if (response.status === 401) this.unauthorized(token);
    if (!response.ok) throw new ApiError(response.status, "photo_unavailable", "Could not load photo.");
    return response.blob();
  };
}

export const fittune = new FitTuneClient();
