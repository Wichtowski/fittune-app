import { useSyncExternalStore } from "react";

import { storage } from "@/lib/storage";
import type { WeightUnit } from "@/schemas/common";

/** Jumps the − and + buttons next to a weight can make, in the user's own unit */
export const WEIGHT_STEPS: Record<WeightUnit, readonly number[]> = {
  kg: [0.5, 1, 1.25, 2.5, 5, 10],
  lb: [1, 2.5, 5, 10, 20],
};

// The smallest pair of plates most gyms have
const DEFAULT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

const key = (unit: WeightUnit) => `fittune.weight-step.${unit}`;
const listeners = new Set<() => void>();

export function getWeightStep(unit: WeightUnit): number {
  const saved = Number(storage.getItem(key(unit)));
  return WEIGHT_STEPS[unit].includes(saved) ? saved : DEFAULT_STEP[unit];
}

export function setWeightStep(unit: WeightUnit, step: number) {
  if (!WEIGHT_STEPS[unit].includes(step)) return;
  storage.setItem(key(unit), String(step));
  for (const listener of listeners) listener();
}

/** The weight jump chosen on this device. It depends on the plates at hand, not on the account */
export function useWeightStep(unit: WeightUnit): number {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => getWeightStep(unit),
  );
}

/** `value` moved by one step and kept free of floating point dust; an empty field counts as 0 */
export function stepValue(value: number | null, delta: number, max: number): number {
  const next = Math.round(((value ?? 0) + delta) * 100) / 100;
  return Math.min(max, Math.max(0, next));
}
