import type { DraftSet } from "./draft";
import { formatDurationInput } from "@/components/number-field";
import { trimNumber, kgTo, metresTo } from "@/lib/units";
import type { DistanceUnit, SetKind, Tracking, WeightUnit } from "@/schemas/common";
import type { ExerciseHistory } from "@/schemas/exercise";

type SetValues = Pick<DraftSet, "reps" | "weight_kg" | "duration_seconds" | "distance_m">;

/** Short "what did I do" text for a set, e.g. "100 × 5", "× 12", "1:30", "5 km · 25:00". */
export function summariseSet(
  set: SetValues,
  tracking: Tracking,
  units: { weightUnit: WeightUnit; distanceUnit: DistanceUnit },
): string | null {
  switch (tracking) {
    case "weight_reps":
      if (set.weight_kg == null && set.reps == null) return null;
      return `${set.weight_kg == null ? "BW" : trimNumber(kgTo(units.weightUnit, set.weight_kg), 1)} × ${set.reps ?? "–"}`;
    case "reps":
      return set.reps == null ? null : `× ${set.reps}`;
    case "duration":
      return set.duration_seconds == null ? null : formatDurationInput(set.duration_seconds);
    case "distance_duration": {
      const parts = [
        set.distance_m == null ? null : `${trimNumber(metresTo(units.distanceUnit, set.distance_m), 2)} ${units.distanceUnit}`,
        set.duration_seconds == null ? null : formatDurationInput(set.duration_seconds),
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
  }
}

/** Sets from the most recent finished session of an exercise, excluding the current workout. */
export function previousSets(history: ExerciseHistory | undefined, currentWorkoutId: string): SetValues[] {
  const session = history?.sessions.find((s) => s.workout_id !== currentWorkoutId);
  return session?.sets ?? [];
}

/** Display labels: warm-ups "W", drop sets "D", everything else numbered in order. */
export function setLabels(kinds: SetKind[]): string[] {
  let n = 0;
  return kinds.map((kind) => {
    if (kind === "warmup") return "W";
    if (kind === "drop") return "D";
    n += 1;
    return String(n);
  });
}
