import { z } from "zod";

const grams = z.number().min(0).max(100);
const optionalGrams = grams.nullable();

/** Values per 100 g, as on an EU nutrition label */
export const nutrientsSchema = z.object({
  energy_kcal: z.number().min(0).max(900),
  protein_g: grams,
  fat_g: grams,
  carbs_g: grams,
  saturated_fat_g: optionalGrams,
  sugars_g: optionalGrams,
  fiber_g: optionalGrams,
  salt_g: optionalGrams,
});
export type Nutrients = z.infer<typeof nutrientsSchema>;

export const totalsSchema = z.object({
  energy_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbs_g: z.number(),
  saturated_fat_g: z.number(),
  sugars_g: z.number(),
  fiber_g: z.number(),
  salt_g: z.number(),
});
export type Totals = z.infer<typeof totalsSchema>;

export const productSchema = z.object({
  id: z.guid(),
  name: z.string(),
  brand: z.string().nullable(),
  barcode: z.string().nullable(),
  per_100g: nutrientsSchema,
  serving_g: z.number().nullable(),
  serving_name: z.string().nullable(),
  source: z.string(),
});
export type Product = z.infer<typeof productSchema>;

const labelValue = z.number({ error: "Enter a number" }).min(0, "Cannot be negative").max(100, "At most 100 g");
const optionalLabelValue = labelValue.nullable();

/** The product form; mirrors the API's label checks so mistakes show before saving */
export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    brand: z.string().trim().max(80).nullable(),
    per_100g: z.object({
      energy_kcal: z.number({ error: "Enter a number" }).min(0, "Cannot be negative").max(900, "At most 900 kcal"),
      protein_g: labelValue,
      fat_g: labelValue,
      carbs_g: labelValue,
      saturated_fat_g: optionalLabelValue,
      sugars_g: optionalLabelValue,
      fiber_g: optionalLabelValue,
      salt_g: optionalLabelValue,
    }),
    serving_g: z.number().min(0.1).max(2000).nullable(),
    serving_name: z.string().trim().max(40).nullable(),
    barcode: z.string().nullable(),
    source: z.enum(["manual", "off"]),
  })
  .superRefine((value, ctx) => {
    const n = value.per_100g;
    if (n.saturated_fat_g != null && n.saturated_fat_g > n.fat_g) {
      ctx.addIssue({ code: "custom", path: ["per_100g", "saturated_fat_g"], message: "Saturates cannot exceed fat" });
    }
    if (n.sugars_g != null && n.sugars_g > n.carbs_g) {
      ctx.addIssue({ code: "custom", path: ["per_100g", "sugars_g"], message: "Sugars cannot exceed carbohydrate" });
    }
    if (n.protein_g + n.fat_g + n.carbs_g > 100) {
      ctx.addIssue({ code: "custom", path: ["per_100g", "carbs_g"], message: "Protein, fat and carbohydrate add up to more than 100 g" });
    }
  });
export type ProductInput = z.infer<typeof productInputSchema>;

/** An Open Food Facts listing that becomes a FitHealth product once someone confirms it */
export const candidateSchema = z.object({
  barcode: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  main_category: z.string().nullable(),
  per_100g: nutrientsSchema.nullable(),
  serving_g: z.number().nullable(),
  serving_name: z.string().nullable(),
});
export type Candidate = z.infer<typeof candidateSchema>;

export const lookupSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("found"), product: productSchema }),
  z.object({ status: z.literal("off"), candidate: candidateSchema }),
  z.object({ status: z.literal("not_found") }),
]);
export type Lookup = z.infer<typeof lookupSchema>;

export const searchResultsSchema = z.object({ products: z.array(productSchema), off: z.array(candidateSchema) });
export type SearchResults = z.infer<typeof searchResultsSchema>;

export const mealSchema = z.object({ id: z.guid(), name: z.string(), position: z.number() });
export type Meal = z.infer<typeof mealSchema>;

export const entrySchema = z.object({
  id: z.guid(),
  date: z.iso.date(),
  meal_id: z.guid(),
  product_id: z.guid().nullable(),
  grams: z.number(),
  product_name: z.string(),
  product_brand: z.string().nullable(),
  per_100g: nutrientsSchema,
});
export type Entry = z.infer<typeof entrySchema>;
export type EntryInput = { date: string; meal_id: string; product_id: string; grams: number };

export const targetsSchema = z.object({
  energy_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbs_g: z.number(),
  training_kcal: z.number(),
});
export type Targets = z.infer<typeof targetsSchema>;

export const MISSING = ["profile", "birthday", "weight"] as const;

export const daySchema = z.object({
  date: z.iso.date(),
  meals: z.array(
    z.object({ id: z.guid(), name: z.string(), archived: z.boolean(), entries: z.array(entrySchema), totals: totalsSchema }),
  ),
  totals: totalsSchema,
  targets: targetsSchema.nullable(),
  exercise: z.object({ workouts: z.number(), activities: z.number(), energy_kcal: z.number(), estimated: z.boolean() }),
  weight_kg: z.number().nullable(),
  missing: z.array(z.enum(MISSING)),
});
export type Day = z.infer<typeof daySchema>;
export type DayMeal = Day["meals"][number];

export const SEXES = ["male", "female"] as const;
export const ACTIVITIES = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export const GOALS = ["lose", "maintain", "gain"] as const;

export const profileSchema = z.object({
  sex: z.enum(SEXES).nullable(),
  height_cm: z.number().nullable(),
  activity: z.enum(ACTIVITIES).nullable(),
  goal: z.enum(GOALS).nullable(),
  pace_kg_per_week: z.number().nullable(),
  energy_kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  carbs_g: z.number().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

export const profileInputSchema = z.object({
  sex: z.enum(SEXES, { error: "Choose one" }),
  height_cm: z.number({ error: "Enter your height" }).min(100, "Between 100 and 250 cm").max(250, "Between 100 and 250 cm"),
  activity: z.enum(ACTIVITIES, { error: "Choose one" }),
  goal: z.enum(GOALS, { error: "Choose one" }),
  pace_kg_per_week: z.number().min(0).max(1),
  energy_kcal: z.number().min(800, "Between 800 and 6000 kcal").max(6000, "Between 800 and 6000 kcal").nullable(),
  protein_g: z.number().min(0).max(500).nullable(),
  fat_g: z.number().min(0).max(400).nullable(),
  carbs_g: z.number().min(0).max(1000).nullable(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const weightSchema = z.object({ date: z.iso.date(), weight_kg: z.number() });
export type Weight = z.infer<typeof weightSchema>;
