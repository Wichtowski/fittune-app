import { z } from "zod";

export const OCR_FIELDS = ["energy_kcal", "fat_g", "saturated_fat_g", "carbs_g", "sugars_g", "fiber_g", "protein_g", "salt_g"] as const;
export type OcrField = typeof OCR_FIELDS[number];
export const OCR_LABELS: Record<OcrField, string> = {
  energy_kcal: "Energy (kcal)", fat_g: "Fat (g)", saturated_fat_g: "of which saturates (g)",
  carbs_g: "Carbohydrate (g)", sugars_g: "of which sugars (g)", fiber_g: "Fibre (g)",
  protein_g: "Protein (g)", salt_g: "Salt (g)",
};
export type Observation = { text: string; confidence: number; bbox: [number, number, number, number] };
export type OcrInput = { width: number; height: number; observations: Observation[]; column?: number };
export const extractionSchema = z.object({
  values: z.object(Object.fromEntries(OCR_FIELDS.map((field) => [field, z.number().finite().nullable()])) as Record<OcrField, z.ZodNullable<z.ZodNumber>>),
  warnings: z.record(z.string(), z.array(z.string())),
  evidence: z.record(z.string(), z.string()),
  unit: z.enum(["g", "ml"]).nullable(),
  columns: z.array(z.object({ label: z.string(), unit: z.enum(["g", "ml"]), amount: z.number(), x: z.number() })),
  selected_column: z.number().int().nonnegative().nullable(),
  source: z.enum(["ocr", "ai"]),
});
export type Extraction = z.infer<typeof extractionSchema>;
export const ocrSettingsSchema = z.object({
  ocr_model: z.string(), models: z.array(z.string()), updated_by: z.string().nullable(), updated_at: z.string(),
  ai_configured: z.boolean(), server_ocr_configured: z.boolean(),
});
