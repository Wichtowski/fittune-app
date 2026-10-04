import { z } from "zod";

// Enumerations shared with fittune-api (see its docs/API.md). Values are the wire format.

export const MUSCLES = [
  "chest",
  "lats",
  "upper_back",
  "lower_back",
  "traps",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "full_body",
  "cardio",
] as const;
export const muscleSchema = z.enum(MUSCLES);
export type Muscle = z.infer<typeof muscleSchema>;

export const EQUIPMENT = ["none", "barbell", "dumbbell", "kettlebell", "machine", "cable", "band", "plate", "other"] as const;
export const equipmentSchema = z.enum(EQUIPMENT);
export type Equipment = z.infer<typeof equipmentSchema>;

// Specific equipment, matched against what an exercise requires. Order is the API's canonical order
export const EQUIPMENT_ITEMS = [
  "barbell", "ez_bar", "trap_bar", "dumbbells", "kettlebells", "weight_plates",
  "flat_bench", "adjustable_bench", "preacher_bench", "back_extension_bench", "squat_rack", "pull_up_bar", "dip_station",
  "leg_press", "leg_extension", "leg_curl", "calf_raise_machine", "smith_machine",
  "chest_press_machine", "pec_deck", "shoulder_press_machine", "assisted_pull_up_machine", "strength_machines",
  "cable_station", "lat_pulldown", "seated_row",
  "treadmill", "rowing_machine", "stationary_bike", "cardio_machines",
  "resistance_band", "suspension_trainer", "stability_ball", "bosu_ball", "medicine_ball", "foam_roller", "plyo_box",
  "ab_wheel", "jump_rope", "battle_ropes", "climbing_rope", "sledgehammer_tire",
] as const;
export const equipmentItemSchema = z.enum(EQUIPMENT_ITEMS);
export type EquipmentItem = z.infer<typeof equipmentItemSchema>;

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

export const TRACKING = ["weight_reps", "reps", "duration", "distance_duration"] as const;
export const trackingSchema = z.enum(TRACKING);
export type Tracking = z.infer<typeof trackingSchema>;

export const SET_KINDS = ["warmup", "normal", "drop", "failure"] as const;
export const setKindSchema = z.enum(SET_KINDS);
export type SetKind = z.infer<typeof setKindSchema>;

export const ACTIVITY_KINDS = ["run", "ride", "walk", "hike", "swim", "row", "other"] as const;
export const activityKindSchema = z.enum(ACTIVITY_KINDS);
export type ActivityKind = z.infer<typeof activityKindSchema>;

export const weightUnitSchema = z.enum(["kg", "lb"]);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

export const distanceUnitSchema = z.enum(["km", "mi"]);
export type DistanceUnit = z.infer<typeof distanceUnitSchema>;

export const ACCOUNT_TYPES = [
  "gym_enthusiast",
  "professional_trainer",
  "nutritionist",
  "psychologist",
  "physical_therapist",
] as const;
export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const roleSchema = z.enum(["user", "admin"]);

// Ids use z.guid() (any 8-4-4-4-12 hex) rather than z.uuid(): catalog exercise ids are
// name-derived on the server and carry no RFC 4122 version bits.

/** Timestamps stay ISO strings end-to-end; they are only turned into Dates for display. */
export const timestampSchema = z.string();
export const dateSchema = z.iso.date();

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), next_cursor: z.string().nullable() });
}
export type Page<T> = { items: T[]; next_cursor: string | null };

// Bounds mirrored from the API so forms fail fast with the same rules.
export const LIMITS = {
  reps: 1000,
  weightKg: 1000,
  durationSeconds: 86_400,
  distanceM: 1_000_000,
  restSeconds: 3600,
  exercisesPerWorkout: 60,
  setsPerExercise: 60,
} as const;
