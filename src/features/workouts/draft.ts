/**
 * Pure operations on an in-progress workout. The store applies them locally and instantly;
 * syncing to the API happens afterwards (see `use-workout-sync.ts`). Every edit bumps
 * `revision`, which the API uses to discard out-of-order writes.
 */
import { newId } from "@/lib/id";
import type { Muscle, SetKind, Tracking } from "@/schemas/common";
import type { Routine } from "@/schemas/routine";
import type { Workout, WorkoutInput, WorkoutSet } from "@/schemas/workout";

export type DraftSet = WorkoutSet;

export type DraftExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  tracking: Tracking;
  primary_muscle: Muscle;
  notes: string | null;
  rest_seconds: number | null;
  sets: DraftSet[];
};

export type DraftWorkout = {
  id: string;
  title: string;
  notes: string | null;
  routine_id: string | null;
  started_at: string;
  ended_at: string | null;
  revision: number;
  exercises: DraftExercise[];
  /** Highest revision the server has acknowledged (0 = never saved). */
  syncedRevision: number;
  /** Revision whose sync failed permanently, and why; cleared by the next edit or a retry. */
  failedRevision: number | null;
  syncError: string | null;
};

export type ExerciseRef = Pick<DraftExercise, "exercise_id" | "exercise_name" | "tracking" | "primary_muscle">;

export const DEFAULT_REST_SECONDS = 90;

export function defaultTitle(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Morning workout";
  if (hour < 17) return "Afternoon workout";
  return "Evening workout";
}

export function emptySet(): DraftSet {
  return {
    id: newId(),
    kind: "normal",
    reps: null,
    weight_kg: null,
    duration_seconds: null,
    distance_m: null,
    rpe: null,
    completed: false,
  };
}

export function createWorkout(init: { title?: string; routine_id?: string | null; exercises?: DraftExercise[] } = {}): DraftWorkout {
  return {
    id: newId(),
    title: init.title?.trim() || defaultTitle(),
    notes: null,
    routine_id: init.routine_id ?? null,
    started_at: new Date().toISOString(),
    ended_at: null,
    revision: 1,
    exercises: init.exercises ?? [],
    syncedRevision: 0,
    failedRevision: null,
    syncError: null,
  };
}

export function exerciseFromRef(ref: ExerciseRef, setCount = 1, restSeconds: number | null = DEFAULT_REST_SECONDS): DraftExercise {
  return {
    id: newId(),
    ...ref,
    notes: null,
    rest_seconds: restSeconds,
    sets: Array.from({ length: setCount }, emptySet),
  };
}

/** Pre-fills a workout from a routine's targets. */
export function workoutFromRoutine(routine: Routine): DraftWorkout {
  return createWorkout({
    title: routine.name,
    routine_id: routine.id,
    exercises: routine.exercises.map((exercise) => ({
      id: newId(),
      exercise_id: exercise.exercise_id,
      exercise_name: exercise.exercise_name,
      tracking: exercise.tracking,
      primary_muscle: exercise.primary_muscle,
      notes: exercise.notes,
      rest_seconds: exercise.rest_seconds ?? DEFAULT_REST_SECONDS,
      sets: (exercise.sets.length > 0 ? exercise.sets : [null]).map((target) => ({
        ...emptySet(),
        kind: target?.kind ?? "normal",
        reps: target?.reps ?? null,
        weight_kg: target?.weight_kg ?? null,
        duration_seconds: target?.duration_seconds ?? null,
        distance_m: target?.distance_m ?? null,
      })),
    })),
  });
}

/** Starts a new session with the same exercises and values as a past workout. */
export function workoutFromPrevious(workout: Workout): DraftWorkout {
  return createWorkout({
    title: workout.title,
    routine_id: workout.routine_id,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      id: newId(),
      sets: exercise.sets.map((set) => ({ ...set, id: newId(), completed: false })),
    })),
  });
}

// --- Edits -----------------------------------------------------------------------------

export type Edit = (workout: DraftWorkout) => DraftWorkout;

/** Applies `edit` as a new revision. Any previous sync failure is superseded by the edit. */
export function revise(workout: DraftWorkout, edit: Edit): DraftWorkout {
  const next = edit(workout);
  if (next === workout) return workout;
  return { ...next, revision: workout.revision + 1, failedRevision: null, syncError: null };
}

function mapExercise(exerciseId: string, fn: (exercise: DraftExercise) => DraftExercise): Edit {
  return (workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => (exercise.id === exerciseId ? fn(exercise) : exercise)),
  });
}

export const edits = {
  rename: (title: string): Edit => (w) => ({ ...w, title }),

  setNotes: (notes: string): Edit => (w) => ({ ...w, notes: notes.trim() ? notes : null }),

  addExercises: (refs: ExerciseRef[]): Edit => (w) => ({
    ...w,
    exercises: [...w.exercises, ...refs.map((ref) => exerciseFromRef(ref))],
  }),

  removeExercise: (exerciseId: string): Edit => (w) => ({
    ...w,
    exercises: w.exercises.filter((exercise) => exercise.id !== exerciseId),
  }),

  moveExercise: (exerciseId: string, direction: -1 | 1): Edit => (w) => {
    const index = w.exercises.findIndex((exercise) => exercise.id === exerciseId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= w.exercises.length) return w;
    const exercises = [...w.exercises];
    const [moved] = exercises.splice(index, 1);
    if (!moved) return w;
    exercises.splice(target, 0, moved);
    return { ...w, exercises };
  },

  setRest: (exerciseId: string, restSeconds: number | null): Edit =>
    mapExercise(exerciseId, (exercise) => ({ ...exercise, rest_seconds: restSeconds })),

  setExerciseNotes: (exerciseId: string, notes: string): Edit =>
    mapExercise(exerciseId, (exercise) => ({ ...exercise, notes: notes.trim() ? notes : null })),

  /** New sets copy the previous set's values, which is what lifters want 90% of the time. */
  addSet: (exerciseId: string): Edit =>
    mapExercise(exerciseId, (exercise) => {
      const last = exercise.sets.at(-1);
      const set: DraftSet = last
        ? { ...last, id: newId(), completed: false, kind: last.kind === "warmup" ? "normal" : last.kind }
        : emptySet();
      return { ...exercise, sets: [...exercise.sets, set] };
    }),

  updateSet: (exerciseId: string, setId: string, patch: Partial<Omit<DraftSet, "id">>): Edit =>
    mapExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
    })),

  setKind: (exerciseId: string, setId: string, kind: SetKind): Edit => edits.updateSet(exerciseId, setId, { kind }),

  removeSet: (exerciseId: string, setId: string): Edit =>
    mapExercise(exerciseId, (exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) })),

  finish: (endedAt = new Date()): Edit => (w) => {
    const started = new Date(w.started_at).getTime();
    // The API caps workouts at 24h; clamp forgotten sessions instead of failing the sync.
    const end = Math.min(Math.max(endedAt.getTime(), started), started + 24 * 3600 * 1000);
    return { ...w, ended_at: new Date(end).toISOString() };
  },
};

// --- Derived values --------------------------------------------------------------------

export function isSetLogged(set: DraftSet): boolean {
  return set.reps != null || set.weight_kg != null || set.duration_seconds != null || set.distance_m != null;
}

export type WorkoutTotals = { completedSets: number; totalSets: number; volumeKg: number; reps: number };

export function totals(workout: Pick<DraftWorkout, "exercises">): WorkoutTotals {
  let completedSets = 0;
  let totalSets = 0;
  let volumeKg = 0;
  let reps = 0;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      totalSets += 1;
      if (!set.completed || set.kind === "warmup") continue;
      completedSets += 1;
      reps += set.reps ?? 0;
      volumeKg += (set.weight_kg ?? 0) * (set.reps ?? 0);
    }
  }
  return { completedSets, totalSets, volumeKg, reps };
}

export function workedMuscles(workout: Pick<DraftWorkout, "exercises">): { muscle: Muscle; sets: number }[] {
  const counts = new Map<Muscle, number>();
  for (const exercise of workout.exercises) {
    const sets = exercise.sets.filter((set) => set.completed && set.kind !== "warmup").length;
    if (sets) counts.set(exercise.primary_muscle, (counts.get(exercise.primary_muscle) ?? 0) + sets);
  }
  return [...counts].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets);
}

export function needsSync(workout: DraftWorkout): boolean {
  return workout.revision > workout.syncedRevision && workout.failedRevision !== workout.revision;
}

/** API body for `PUT /workouts/{id}`; local-only fields are dropped. */
export function toWorkoutInput(workout: DraftWorkout): WorkoutInput {
  return {
    title: workout.title.trim() || defaultTitle(new Date(workout.started_at)),
    notes: workout.notes?.trim() || null,
    routine_id: workout.routine_id,
    started_at: workout.started_at,
    ended_at: workout.ended_at,
    revision: workout.revision,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.exercise_id,
      notes: exercise.notes?.trim() || null,
      rest_seconds: exercise.rest_seconds,
      sets: exercise.sets,
    })),
  };
}
