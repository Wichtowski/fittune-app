import { z } from "zod";

import { LIMITS, muscleSchema, setKindSchema, timestampSchema, trackingSchema } from "./common";

import { placeSchema } from "./place";

const nullableNumber = z.number().nullable();

export const workoutSetSchema = z.object({
  id: z.guid(),
  kind: setKindSchema,
  reps: z.number().int().min(0).max(LIMITS.reps).nullable(),
  weight_kg: z.number().min(0).max(LIMITS.weightKg).nullable(),
  duration_seconds: z.number().int().min(0).max(LIMITS.durationSeconds).nullable(),
  distance_m: z.number().min(0).max(LIMITS.distanceM).nullable(),
  rpe: z.number().min(1).max(10).nullable(),
  completed: z.boolean(),
});
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const workoutExerciseSchema = z.object({
  id: z.guid(),
  exercise_id: z.guid(),
  exercise_name: z.string(),
  tracking: trackingSchema,
  primary_muscle: muscleSchema,
  notes: z.string().nullable(),
  rest_seconds: z.number().int().min(0).max(LIMITS.restSeconds).nullable(),
  sets: z.array(workoutSetSchema).max(LIMITS.setsPerExercise),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const workoutSchema = z.object({
  id: z.guid(),
  routine_id: z.guid().nullable(),
  place: placeSchema.nullish(),
  title: z.string(),
  notes: z.string().nullable(),
  started_at: timestampSchema,
  ended_at: timestampSchema.nullable(),
  revision: z.number(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  exercises: z.array(workoutExerciseSchema),
});
export type Workout = z.infer<typeof workoutSchema>;

/** Request body of `PUT /workouts/{id}`: the workout document without server metadata. */
export type WorkoutInput = {
  title: string;
  notes: string | null;
  routine_id: string | null;
  place_version_id?: string | null;
  started_at: string;
  ended_at: string | null;
  revision: number;
  exercises: Array<{
    id: string;
    exercise_id: string;
    notes: string | null;
    rest_seconds: number | null;
    sets: WorkoutSet[];
  }>;
};

export const workoutSummarySchema = z.object({
  id: z.guid(),
  routine_id: z.guid().nullable(),
  place: placeSchema.nullish(),
  title: z.string(),
  started_at: timestampSchema,
  ended_at: timestampSchema.nullable(),
  duration_seconds: nullableNumber,
  exercise_count: z.number(),
  set_count: z.number(),
  total_reps: z.number(),
  volume_kg: z.number(),
  exercise_names: z.array(z.string()),
});
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;
