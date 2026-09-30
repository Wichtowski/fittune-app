import { z } from "zod";

import { kgTo, metresTo } from "@/lib/units";

import { type WeightUnit, type DistanceUnit, LIMITS, muscleSchema, setKindSchema, timestampSchema, trackingSchema } from "./common";

export const setTargetSchema = z.object({
  kind: setKindSchema,
  reps: z.number().nullable(),
  weight_kg: z.number().nullable(),
  duration_seconds: z.number().nullable(),
  distance_m: z.number().nullable(),
});
export type SetTarget = z.infer<typeof setTargetSchema>;

export const routineSchema = z.object({
  id: z.guid(),
  name: z.string(),
  notes: z.string().nullable(),
  last_performed_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  exercises: z.array(
    z.object({
      id: z.guid(),
      exercise_id: z.guid(),
      exercise_name: z.string(),
      tracking: trackingSchema,
      primary_muscle: muscleSchema,
      rest_seconds: z.number().nullable(),
      notes: z.string().nullable(),
      sets: z.array(setTargetSchema),
    }),
  ),
});
export type Routine = z.infer<typeof routineSchema>;

export type RoutineInput = {
  name: string;
  notes: string | null;
  exercises: Array<{ exercise_id: string; rest_seconds: number | null; notes: string | null; sets: SetTarget[] }>;
};

/** Optional numeric form field: empty input means "no target". */
const optionalNumber = (max: number, whole = false) => {
  const number = z.coerce.number<string | number>().min(0, "Must not be negative").max(max, `At most ${max}`);
  return z.union([z.literal(""), whole ? number.int() : number]);
};

/**
 * Routine editor form. Weights and distances are entered in the user's display units and
 * converted when building the request body.
 */
export function routineFormSchemaFor({ weightUnit, distanceUnit }: { weightUnit: WeightUnit; distanceUnit: DistanceUnit }) {
  return z.object({
    name: z.string().trim().min(1, "Name is required").max(80, "Name must be at most 80 characters long"),
    notes: z.string().trim().max(2000),
    exercises: z
      .array(
        z.object({
          exercise_id: z.guid(),
          exercise_name: z.string(),
          tracking: trackingSchema,
          rest_seconds: optionalNumber(LIMITS.restSeconds, true),
          sets: z
            .array(
              z.object({
                kind: setKindSchema,
                reps: optionalNumber(LIMITS.reps, true),
                weight: optionalNumber(kgTo(weightUnit, LIMITS.weightKg)),
                duration_seconds: optionalNumber(LIMITS.durationSeconds, true),
                distance: optionalNumber(metresTo(distanceUnit, LIMITS.distanceM)),
              }),
            )
            .max(LIMITS.setsPerExercise),
        }),
      )
      .max(LIMITS.exercisesPerWorkout),
  });
}

export const routineFormSchema = routineFormSchemaFor({ weightUnit: "kg", distanceUnit: "km" });
export type RoutineFormInput = z.input<typeof routineFormSchema>;
export type RoutineFormOutput = z.output<typeof routineFormSchema>;
