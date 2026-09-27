import { z } from "zod";

import { activityKindSchema, timestampSchema } from "./common";

export const activitySchema = z.object({
  id: z.guid(),
  kind: activityKindSchema,
  title: z.string(),
  notes: z.string().nullable(),
  started_at: timestampSchema,
  duration_seconds: z.number(),
  distance_m: z.number().nullable(),
  elevation_gain_m: z.number().nullable(),
  avg_heart_rate: z.number().nullable(),
  calories: z.number().nullable(),
  perceived_effort: z.number().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Activity = z.infer<typeof activitySchema>;

export type ActivityInput = Omit<Activity, "id" | "created_at" | "updated_at">;

const optionalNumber = (min: number, max: number, message?: string) =>
  z.union([
    z.literal(""),
    z.coerce
      .number<string | number>()
      .min(min, message ?? `Must be between ${min} and ${max}`)
      .max(max, message ?? `Must be between ${min} and ${max}`),
  ]);

const wholeNumber = (max: number) => z.coerce.number<string | number>().int().min(0).max(max);

/**
 * Activity form. Duration is split into h/m/s and distance is in the user's unit;
 * `toActivityInput` turns the parsed values into the API body.
 */
export const activityFormSchema = z
  .object({
    kind: activityKindSchema,
    title: z.string().trim().min(1, "Title is required").max(120, "Title must be at most 120 characters long"),
    started_at: z.string().min(1, "Start time is required"),
    hours: wholeNumber(167),
    minutes: wholeNumber(59),
    seconds: wholeNumber(59),
    distance: optionalNumber(0, 2000),
    elevation_gain_m: optionalNumber(0, 20_000),
    avg_heart_rate: optionalNumber(30, 250, "Heart rate must be between 30 and 250"),
    perceived_effort: z.union([z.literal(""), z.coerce.number<string | number>().int().min(1).max(10)]),
    notes: z.string().trim().max(2000),
  })
  .refine((v) => v.hours * 3600 + v.minutes * 60 + v.seconds > 0, {
    path: ["minutes"],
    message: "Duration must be longer than zero",
  })
  .refine((v) => !Number.isNaN(new Date(v.started_at).getTime()), {
    path: ["started_at"],
    message: "Enter a valid date and time",
  });
export type ActivityFormInput = z.input<typeof activityFormSchema>;
export type ActivityFormOutput = z.output<typeof activityFormSchema>;
