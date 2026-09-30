import { getLocale } from "@/lib/i18n";
import type { Nutrients, Totals } from "@/schemas/health";

/** What `amount` (in the product's unit) of a food with the given per-100 values contains */
export function scale(per100g: Nutrients, amount: number): Totals {
  const f = amount / 100;
  return {
    energy_kcal: per100g.energy_kcal * f,
    protein_g: per100g.protein_g * f,
    fat_g: per100g.fat_g * f,
    carbs_g: per100g.carbs_g * f,
    saturated_fat_g: (per100g.saturated_fat_g ?? 0) * f,
    sugars_g: (per100g.sugars_g ?? 0) * f,
    fiber_g: (per100g.fiber_g ?? 0) * f,
    salt_g: (per100g.salt_g ?? 0) * f,
  };
}

/** How far into a target the day is; `ratio` is capped at 1 for bars, `left` goes negative when over */
export function progress(eaten: number, target: number | undefined): { ratio: number; left: number | null; over: boolean } {
  if (target === undefined) return { ratio: 0, left: null, over: false };
  if (target === 0) return { ratio: eaten > 0 ? 1 : 0, left: -Math.round(eaten) || 0, over: eaten > 0 };
  return { ratio: Math.min(eaten / target, 1), left: Math.round(target - eaten), over: eaten > target };
}

/** Whole calories; grams and millilitres with one decimal only while small enough to matter */
export function formatAmount(value: number, unit: "kcal" | "g" | "ml"): string {
  const digits = unit !== "kcal" && Math.abs(value) < 10 ? 1 : 0;
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: digits }).format(value);
}
