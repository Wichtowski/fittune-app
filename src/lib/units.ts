import type { DistanceUnit, WeightUnit } from "@/schemas/common";

const KG_PER_LB = 0.45359237;
const M_PER_MI = 1609.344;

/** Weights are stored in kg; convert for display in the user's unit. */
export function kgTo(unit: WeightUnit, kg: number): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

/** Convert a weight typed in the user's unit back to kg for storage. */
export function toKg(unit: WeightUnit, value: number): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

export function metresTo(unit: DistanceUnit, metres: number): number {
  return unit === "km" ? metres / 1000 : metres / M_PER_MI;
}

export function toMetres(unit: DistanceUnit, value: number): number {
  return unit === "km" ? value * 1000 : value * M_PER_MI;
}

/** Rounds to at most `decimals` places and drops trailing zeros: 102.50 -> "102.5". */
export function trimNumber(value: number, decimals = 1): string {
  const factor = 10 ** decimals;
  return String(Math.round(value * factor) / factor);
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit, withUnit = true): string {
  if (kg == null) return "–";
  const text = trimNumber(kgTo(unit, kg), 1);
  return withUnit ? `${text} ${unit}` : text;
}

/** Training volume, compacted above 10 000 (e.g. "18.3k kg"). */
export function formatVolume(kg: number, unit: WeightUnit): string {
  const value = kgTo(unit, kg);
  if (value >= 10_000) return `${trimNumber(value / 1000, 1)}k ${unit}`;
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

export function formatDistance(metres: number | null | undefined, unit: DistanceUnit, decimals = 2): string {
  if (metres == null) return "–";
  return `${metres === 0 ? "0" : metresTo(unit, metres).toFixed(decimals)} ${unit}`;
}

/** Pace for foot-based activities, e.g. "5:12 /km". */
export function formatPace(durationSeconds: number, metres: number | null, unit: DistanceUnit): string | null {
  if (!metres || metres <= 0 || durationSeconds <= 0) return null;
  const secondsPerUnit = durationSeconds / metresTo(unit, metres);
  if (!Number.isFinite(secondsPerUnit) || secondsPerUnit > 3600) return null;
  const minutes = Math.floor(secondsPerUnit / 60);
  const seconds = Math.round(secondsPerUnit % 60);
  const [m, s] = seconds === 60 ? [minutes + 1, 0] : [minutes, seconds];
  return `${m}:${String(s).padStart(2, "0")} /${unit}`;
}

/** Speed for wheel/water activities, e.g. "24.1 km/h". */
export function formatSpeed(durationSeconds: number, metres: number | null, unit: DistanceUnit): string | null {
  if (!metres || durationSeconds <= 0) return null;
  const perHour = metresTo(unit, metres) / (durationSeconds / 3600);
  return `${perHour.toFixed(1)} ${unit === "km" ? "km/h" : "mph"}`;
}
