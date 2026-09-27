import { z } from "zod";

import { dateSchema, muscleSchema, timestampSchema, trackingSchema } from "./common";

export const totalsSchema = z.object({
  workouts: z.number(),
  workout_seconds: z.number(),
  sets: z.number(),
  reps: z.number(),
  volume_kg: z.number(),
  activities: z.number(),
  activity_seconds: z.number(),
  activity_distance_m: z.number(),
});
export type Totals = z.infer<typeof totalsSchema>;

export const overviewSchema = z.object({
  from: dateSchema,
  to: dateSchema,
  current: totalsSchema,
  previous: totalsSchema,
  streak_weeks: z.number(),
});
export type Overview = z.infer<typeof overviewSchema>;

export const timelinePointSchema = totalsSchema.extend({ bucket: dateSchema });
export type TimelinePoint = z.infer<typeof timelinePointSchema>;

export const muscleVolumeSchema = z.object({ muscle: muscleSchema, sets: z.number(), volume_kg: z.number() });
export type MuscleVolume = z.infer<typeof muscleVolumeSchema>;

export const exerciseRecordSchema = z.object({
  exercise_id: z.guid(),
  exercise_name: z.string(),
  tracking: trackingSchema,
  primary_muscle: muscleSchema,
  max_weight_kg: z.number().nullable(),
  best_e1rm_kg: z.number().nullable(),
  max_reps: z.number().nullable(),
  max_duration_seconds: z.number().nullable(),
  max_distance_m: z.number().nullable(),
  sessions: z.number(),
  last_performed_at: timestampSchema,
});
export type ExerciseRecord = z.infer<typeof exerciseRecordSchema>;

export type Bucket = "week" | "month";
export type Period = { from: string; to: string };
