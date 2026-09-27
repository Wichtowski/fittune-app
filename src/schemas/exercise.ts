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
  instructions: z.string().nullable(),
  is_custom: z.boolean(),
  archived_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Exercise = z.infer<typeof exerciseSchema>;

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
