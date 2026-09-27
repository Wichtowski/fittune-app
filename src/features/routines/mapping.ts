import { kgTo, metresTo, toKg, toMetres, trimNumber } from "@/lib/units";
import type { DistanceUnit, Tracking, WeightUnit } from "@/schemas/common";
import type { Routine, RoutineFormInput, RoutineFormOutput, RoutineInput } from "@/schemas/routine";

type Units = { weightUnit: WeightUnit; distanceUnit: DistanceUnit };

const blank = (value: number | null, map: (v: number) => number = (v) => v): string | number =>
  value == null ? "" : Number(trimNumber(map(value), 2));

export function emptySetTarget(): RoutineFormInput["exercises"][number]["sets"][number] {
  return { kind: "normal", reps: "", weight: "", duration_seconds: "", distance: "" };
}

export function newExerciseEntry(exercise: { id: string; name: string; tracking: Tracking }): RoutineFormInput["exercises"][number] {
  return {
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    tracking: exercise.tracking,
    rest_seconds: 90,
    sets: [emptySetTarget(), emptySetTarget(), emptySetTarget()],
  };
}

export function toRoutineForm(routine: Routine | undefined, units: Units): RoutineFormInput {
  if (!routine) return { name: "", notes: "", exercises: [] };
  return {
    name: routine.name,
    notes: routine.notes ?? "",
    exercises: routine.exercises.map((exercise) => ({
      exercise_id: exercise.exercise_id,
      exercise_name: exercise.exercise_name,
      tracking: exercise.tracking,
      rest_seconds: exercise.rest_seconds ?? "",
      sets: exercise.sets.map((set) => ({
        kind: set.kind,
        reps: blank(set.reps),
        weight: blank(set.weight_kg, (kg) => kgTo(units.weightUnit, kg)),
        duration_seconds: blank(set.duration_seconds),
        distance: blank(set.distance_m, (m) => metresTo(units.distanceUnit, m)),
      })),
    })),
  };
}

const orNull = (value: number | "") => (value === "" ? null : value);

/** Form values (display units) -> API body (kg, metres). */
export function toRoutineInput(values: RoutineFormOutput, units: Units): RoutineInput {
  return {
    name: values.name,
    notes: values.notes || null,
    exercises: values.exercises.map((exercise) => ({
      exercise_id: exercise.exercise_id,
      rest_seconds: orNull(exercise.rest_seconds),
      notes: null,
      sets: exercise.sets.map((set) => {
        const weight = orNull(set.weight);
        const distance = orNull(set.distance);
        return {
          kind: set.kind,
          reps: orNull(set.reps),
          weight_kg: weight == null ? null : Math.round(toKg(units.weightUnit, weight) * 100) / 100,
          duration_seconds: orNull(set.duration_seconds),
          distance_m: distance == null ? null : Math.round(toMetres(units.distanceUnit, distance)),
        };
      }),
    })),
  };
}
