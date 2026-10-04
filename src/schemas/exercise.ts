import { z } from "zod";

import {
  difficultySchema,
  equipmentItemSchema,
  equipmentSchema,
  muscleSchema,
  setKindSchema,
  timestampSchema,
  trackingSchema,
} from "./common";

// Stored by the API; `url` is relative to the API origin. `attribution` is the credit the
// media's licence requires next to it
const storedMedia = {
  id: z.guid(),
  provider: z.literal("fittune"),
  position: z.number().int(),
  url: z.string().startsWith("/"),
  attribution: z.string().optional(),
};

export const exerciseMediaSchema = z.discriminatedUnion("kind", [
  z.object({ ...storedMedia, kind: z.literal("photo") }),
  // An animated GIF of the movement
  z.object({ ...storedMedia, kind: z.literal("animation") }),
  z.object({ id: z.guid(), kind: z.literal("video"), provider: z.enum(["youtube", "vimeo"]), position: z.number().int(), external_id: z.string() }),
]);
export type ExerciseMedia = z.infer<typeof exerciseMediaSchema>;

export const exerciseSchema = z.object({
  id: z.guid(),
  name: z.string(),
  tracking: trackingSchema,
  primary_muscle: muscleSchema,
  secondary_muscles: z.array(muscleSchema),
  equipment: equipmentSchema,
  requires: z.array(equipmentItemSchema),
  difficulty: difficultySchema,
  video_id: z.string().nullable(),
  // English for catalog exercises. Both texts are null in the library list, which leaves them
  // out to stay small: read them from one exercise or its history
  instructions: z.string().nullable(),
  instructions_pl: z.string().nullable().default(null),
  // Created by a user instead of coming with the catalog. Created exercises are shared, so
  // `created_by` names whose it is and `is_own` says whether it is this user's to change;
  // an API that predates sharing sends neither and only ever lists the user's own
  is_custom: z.boolean(),
  is_own: z.boolean().optional(),
  created_by: z.string().nullable().default(null),
  archived_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  // Photos, then animations, then videos, each by position; absent from APIs that predate it
  media: z.array(exerciseMediaSchema).default([]),
});
export type Exercise = z.infer<typeof exerciseSchema>;

/** Whether the signed-in user created the exercise and may edit or archive it */
export function isOwnExercise(exercise: Pick<Exercise, "is_own" | "is_custom">): boolean {
  return exercise.is_own ?? exercise.is_custom;
}

/** What tells a created exercise apart in a list: that it is yours, or whose it is */
export function exerciseOrigin(exercise: Pick<Exercise, "is_own" | "is_custom" | "created_by">): { own: boolean; by: string | null } | null {
  if (!exercise.is_custom) return null;
  return { own: isOwnExercise(exercise), by: exercise.created_by };
}

/** Used both by the custom-exercise form and as the API request body. */
export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be at most 80 characters long"),
  tracking: trackingSchema,
  primary_muscle: muscleSchema,
  secondary_muscles: z.array(muscleSchema),
  equipment: equipmentSchema,
  // Everything the exercise needs; empty for bodyweight
  requires: z.array(equipmentItemSchema),
  difficulty: difficultySchema,
  video_id: z
    .string()
    .trim()
    .regex(/^([A-Za-z0-9_-]{11})?$/, "Use the 11 character YouTube video id")
    .transform((v) => v || null)
    .nullable(),
  instructions: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null)
    .nullable(),
});
export type ExerciseInputForm = z.input<typeof exerciseInputSchema>;
export type ExerciseInput = z.output<typeof exerciseInputSchema>;

const recordSchema = z.object({ value: z.number(), workout_id: z.guid(), achieved_at: timestampSchema }).nullable();

export const exerciseHistorySchema = z.object({
  exercise: exerciseSchema,
  records: z.object({
    max_weight_kg: recordSchema,
    best_e1rm_kg: recordSchema,
    max_reps: recordSchema,
    best_session_volume_kg: recordSchema,
    max_duration_seconds: recordSchema,
    max_distance_m: recordSchema,
  }),
  sessions: z.array(
    z.object({
      workout_id: z.guid(),
      workout_title: z.string(),
      started_at: timestampSchema,
      sets: z.array(
        z.object({
          kind: setKindSchema,
          reps: z.number().nullable(),
          weight_kg: z.number().nullable(),
          duration_seconds: z.number().nullable(),
          distance_m: z.number().nullable(),
          rpe: z.number().nullable(),
          e1rm_kg: z.number().nullable(),
        }),
      ),
      working_sets: z.number(),
      total_reps: z.number(),
      volume_kg: z.number(),
      max_weight_kg: z.number().nullable(),
      best_e1rm_kg: z.number().nullable(),
      max_duration_seconds: z.number().nullable(),
      max_distance_m: z.number().nullable(),
    }),
  ),
});
export type ExerciseHistory = z.infer<typeof exerciseHistorySchema>;
export type ExerciseSession = ExerciseHistory["sessions"][number];
