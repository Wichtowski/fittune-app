import { newExerciseEntry } from "./mapping";
import { kgTo, trimNumber } from "@/lib/units";
import type { WeightUnit } from "@/schemas/common";
import type { Exercise, ExerciseHistory } from "@/schemas/exercise";
import type { RoutineFormInput } from "@/schemas/routine";

export const templateCategories = ["Full body", "Push / Pull / Legs", "Upper / Lower", "Targeted muscles", "Home workouts", "Conditioning"] as const;
export type TemplateCategory = (typeof templateCategories)[number];

type Prescription = readonly [exercise: string, sets: number, repsOrSeconds: number, restSeconds?: number];
export type RoutineTemplate = { name: string; category: TemplateCategory; exercises: readonly Prescription[] };

const fb: TemplateCategory = "Full body";
const ppl: TemplateCategory = "Push / Pull / Legs";
const ul: TemplateCategory = "Upper / Lower";
const focus: TemplateCategory = "Targeted muscles";
const home: TemplateCategory = "Home workouts";
const conditioning: TemplateCategory = "Conditioning";

export const routineTemplates: readonly RoutineTemplate[] = [
  { name: "Full Body Foundation A", category: fb, exercises: [["Barbell Back Squat", 3, 8, 150], ["Barbell Bench Press", 3, 8, 120], ["Seated Cable Row", 3, 10], ["Romanian Deadlift", 2, 10], ["Plank", 3, 45, 60]] },
  { name: "Full Body Foundation B", category: fb, exercises: [["Leg Press", 3, 10], ["Overhead Press", 3, 8, 120], ["Lat Pulldown", 3, 10], ["Hip Thrust", 3, 10], ["Hanging Leg Raise", 2, 12]] },
  { name: "Full Body Strength A", category: fb, exercises: [["Barbell Back Squat", 4, 5, 180], ["Barbell Bench Press", 4, 5, 180], ["Barbell Row", 4, 6, 150], ["Standing Calf Raise", 3, 12]] },
  { name: "Full Body Strength B", category: fb, exercises: [["Conventional Deadlift", 3, 5, 180], ["Overhead Press", 4, 6, 150], ["Pull-Up", 4, 6, 150], ["Bulgarian Split Squat", 3, 8, 120]] },
  { name: "Full Body Hypertrophy A", category: fb, exercises: [["Leg Press", 3, 12], ["Incline Dumbbell Press", 3, 10], ["Lat Pulldown", 3, 12], ["Lying Leg Curl", 3, 12], ["Lateral Raise", 3, 15], ["Cable Crunch", 3, 15]] },
  { name: "Full Body Hypertrophy B", category: fb, exercises: [["Bulgarian Split Squat", 3, 10], ["Seated Dumbbell Shoulder Press", 3, 10], ["One-Arm Dumbbell Row", 3, 12], ["Hip Thrust", 3, 12], ["Cable Crossover", 3, 12], ["Hammer Curl", 2, 12]] },
  { name: "Full Body Dumbbells A", category: fb, exercises: [["Walking Lunge", 3, 12], ["Incline Dumbbell Press", 3, 10], ["One-Arm Dumbbell Row", 3, 10], ["Seated Dumbbell Shoulder Press", 3, 10], ["Plank", 3, 45, 60]] },
  { name: "Full Body Dumbbells B", category: fb, exercises: [["Bulgarian Split Squat", 3, 10], ["Dumbbell Fly", 3, 12], ["One-Arm Dumbbell Row", 3, 12], ["Lateral Raise", 3, 15], ["Hammer Curl", 2, 12], ["Overhead Triceps Extension", 2, 12]] },

  { name: "Push A · Strength", category: ppl, exercises: [["Barbell Bench Press", 4, 5, 180], ["Overhead Press", 4, 6, 150], ["Incline Dumbbell Press", 3, 8], ["Close-Grip Bench Press", 3, 8], ["Lateral Raise", 3, 15]] },
  { name: "Push B · Hypertrophy", category: ppl, exercises: [["Incline Dumbbell Press", 4, 10], ["Seated Dumbbell Shoulder Press", 3, 10], ["Cable Crossover", 3, 12], ["Lateral Raise", 4, 15], ["Triceps Pushdown", 3, 12]] },
  { name: "Push C · Chest", category: ppl, exercises: [["Barbell Bench Press", 4, 8, 150], ["Incline Dumbbell Press", 3, 10], ["Dumbbell Fly", 3, 12], ["Chest Dip", 3, 10], ["Overhead Triceps Extension", 3, 12]] },
  { name: "Push D · Shoulders", category: ppl, exercises: [["Overhead Press", 4, 6, 150], ["Seated Dumbbell Shoulder Press", 3, 10], ["Lateral Raise", 4, 15], ["Rear Delt Fly", 3, 15], ["Close-Grip Bench Press", 3, 8]] },
  { name: "Pull A · Strength", category: ppl, exercises: [["Conventional Deadlift", 3, 5, 180], ["Pull-Up", 4, 6, 150], ["Barbell Row", 4, 6, 150], ["Barbell Curl", 3, 8], ["Barbell Shrug", 3, 12]] },
  { name: "Pull B · Hypertrophy", category: ppl, exercises: [["Lat Pulldown", 4, 10], ["Seated Cable Row", 4, 10], ["One-Arm Dumbbell Row", 3, 12], ["Face Pull", 3, 15], ["Hammer Curl", 3, 12]] },
  { name: "Pull C · Width", category: ppl, exercises: [["Pull-Up", 4, 8, 120], ["Lat Pulldown", 4, 12], ["One-Arm Dumbbell Row", 3, 10], ["Face Pull", 3, 15], ["Incline Dumbbell Curl", 3, 12]] },
  { name: "Pull D · Upper Back", category: ppl, exercises: [["Barbell Row", 4, 8, 150], ["Seated Cable Row", 4, 10], ["Rear Delt Fly", 3, 15], ["Barbell Shrug", 3, 12], ["Barbell Curl", 3, 10]] },
  { name: "Legs A · Squat", category: ppl, exercises: [["Barbell Back Squat", 4, 6, 180], ["Leg Press", 3, 10], ["Leg Extension", 3, 12], ["Lying Leg Curl", 3, 12], ["Standing Calf Raise", 4, 15]] },
  { name: "Legs B · Posterior Chain", category: ppl, exercises: [["Romanian Deadlift", 4, 8, 150], ["Hip Thrust", 4, 10, 120], ["Lying Leg Curl", 3, 12], ["Walking Lunge", 3, 12], ["Standing Calf Raise", 4, 15]] },
  { name: "Legs C · Quads", category: ppl, exercises: [["Front Squat", 4, 6, 180], ["Bulgarian Split Squat", 3, 10], ["Leg Press", 3, 12], ["Leg Extension", 3, 15], ["Standing Calf Raise", 4, 15]] },
  { name: "Legs D · Glutes", category: ppl, exercises: [["Hip Thrust", 4, 8, 150], ["Bulgarian Split Squat", 3, 10], ["Romanian Deadlift", 3, 10], ["Walking Lunge", 3, 12], ["Lying Leg Curl", 3, 12]] },

  { name: "Upper A · Strength", category: ul, exercises: [["Barbell Bench Press", 4, 5, 180], ["Barbell Row", 4, 6, 150], ["Overhead Press", 3, 6, 150], ["Pull-Up", 3, 8], ["Barbell Curl", 2, 10], ["Triceps Pushdown", 2, 10]] },
  { name: "Upper B · Strength", category: ul, exercises: [["Overhead Press", 4, 5, 180], ["Pull-Up", 4, 6, 150], ["Incline Dumbbell Press", 3, 8], ["Seated Cable Row", 3, 8], ["Close-Grip Bench Press", 2, 8], ["Hammer Curl", 2, 10]] },
  { name: "Upper A · Hypertrophy", category: ul, exercises: [["Incline Dumbbell Press", 3, 10], ["Lat Pulldown", 3, 12], ["Seated Dumbbell Shoulder Press", 3, 10], ["Seated Cable Row", 3, 12], ["Lateral Raise", 3, 15], ["Triceps Pushdown", 2, 12], ["Hammer Curl", 2, 12]] },
  { name: "Upper B · Hypertrophy", category: ul, exercises: [["Cable Crossover", 3, 12], ["One-Arm Dumbbell Row", 3, 12], ["Rear Delt Fly", 3, 15], ["Lat Pulldown", 3, 12], ["Dumbbell Fly", 3, 12], ["Overhead Triceps Extension", 2, 12], ["Incline Dumbbell Curl", 2, 12]] },
  { name: "Lower A · Strength", category: ul, exercises: [["Barbell Back Squat", 4, 5, 180], ["Romanian Deadlift", 4, 6, 150], ["Leg Press", 3, 8], ["Standing Calf Raise", 4, 12], ["Plank", 3, 45, 60]] },
  { name: "Lower B · Strength", category: ul, exercises: [["Conventional Deadlift", 3, 5, 180], ["Front Squat", 4, 6, 150], ["Hip Thrust", 3, 8], ["Standing Calf Raise", 4, 12], ["Hanging Leg Raise", 3, 10]] },
  { name: "Lower A · Hypertrophy", category: ul, exercises: [["Leg Press", 4, 12], ["Lying Leg Curl", 4, 12], ["Bulgarian Split Squat", 3, 10], ["Leg Extension", 3, 15], ["Standing Calf Raise", 4, 15]] },
  { name: "Lower B · Hypertrophy", category: ul, exercises: [["Hip Thrust", 4, 12], ["Romanian Deadlift", 3, 10], ["Walking Lunge", 3, 12], ["Lying Leg Curl", 3, 15], ["Standing Calf Raise", 4, 15]] },

  { name: "Chest · Heavy Press", category: focus, exercises: [["Barbell Bench Press", 5, 5, 180], ["Incline Dumbbell Press", 4, 8], ["Chest Dip", 3, 8], ["Cable Crossover", 3, 12]] },
  { name: "Chest · Volume", category: focus, exercises: [["Incline Dumbbell Press", 4, 10], ["Barbell Bench Press", 3, 10], ["Dumbbell Fly", 3, 12], ["Cable Crossover", 3, 15], ["Push-Up", 2, 15]] },
  { name: "Back · Lats", category: focus, exercises: [["Pull-Up", 4, 8], ["Lat Pulldown", 4, 10], ["One-Arm Dumbbell Row", 4, 10], ["Seated Cable Row", 3, 12]] },
  { name: "Back · Rows", category: focus, exercises: [["Barbell Row", 4, 8, 150], ["Seated Cable Row", 4, 10], ["One-Arm Dumbbell Row", 3, 12], ["Face Pull", 3, 15], ["Barbell Shrug", 3, 12]] },
  { name: "Shoulders · Press", category: focus, exercises: [["Overhead Press", 4, 6, 150], ["Seated Dumbbell Shoulder Press", 3, 10], ["Lateral Raise", 4, 15], ["Rear Delt Fly", 3, 15]] },
  { name: "Shoulders · Delts", category: focus, exercises: [["Seated Dumbbell Shoulder Press", 3, 10], ["Lateral Raise", 4, 15], ["Rear Delt Fly", 4, 15], ["Face Pull", 3, 15]] },
  { name: "Arms · Biceps", category: focus, exercises: [["Barbell Curl", 4, 8], ["Incline Dumbbell Curl", 3, 12], ["Hammer Curl", 3, 12], ["Chin-Up", 3, 8]] },
  { name: "Arms · Triceps", category: focus, exercises: [["Close-Grip Bench Press", 4, 8], ["Triceps Pushdown", 3, 12], ["Overhead Triceps Extension", 3, 12], ["Skull Crusher", 3, 10]] },
  { name: "Quads · Strength", category: focus, exercises: [["Barbell Back Squat", 5, 5, 180], ["Front Squat", 3, 6, 150], ["Leg Press", 3, 10], ["Leg Extension", 3, 12]] },
  { name: "Hamstrings · Hinge", category: focus, exercises: [["Romanian Deadlift", 4, 8, 150], ["Lying Leg Curl", 4, 12], ["Hip Thrust", 3, 10], ["Kettlebell Swing", 3, 15]] },
  { name: "Glutes · Strength", category: focus, exercises: [["Hip Thrust", 4, 8, 150], ["Romanian Deadlift", 3, 10], ["Bulgarian Split Squat", 3, 10], ["Walking Lunge", 3, 12]] },
  { name: "Calves & Core", category: focus, exercises: [["Standing Calf Raise", 5, 15], ["Hanging Leg Raise", 3, 12], ["Cable Crunch", 3, 15], ["Plank", 3, 60, 60]] },
  { name: "Core · Bodyweight", category: focus, exercises: [["Plank", 4, 60, 60], ["Hanging Leg Raise", 4, 10], ["Ab Wheel Rollout", 3, 10], ["Burpee", 3, 10]] },
  { name: "Core · Cable & Bar", category: focus, exercises: [["Cable Crunch", 4, 12], ["Hanging Leg Raise", 3, 12], ["Ab Wheel Rollout", 3, 10], ["Plank", 3, 45, 60]] },

  { name: "Home · No Equipment", category: home, exercises: [["Push-Up", 4, 12], ["Burpee", 4, 10], ["Plank", 3, 45, 60]] },
  { name: "Home · Pull-up Bar", category: home, exercises: [["Push-Up", 3, 15], ["Pull-Up", 3, 6], ["Hanging Leg Raise", 3, 10], ["Burpee", 3, 12]] },
  { name: "Home · Dumbbell Upper A", category: home, exercises: [["Incline Dumbbell Press", 3, 10], ["One-Arm Dumbbell Row", 3, 12], ["Seated Dumbbell Shoulder Press", 3, 10], ["Hammer Curl", 3, 12], ["Overhead Triceps Extension", 3, 12]] },
  { name: "Home · Dumbbell Upper B", category: home, exercises: [["Dumbbell Fly", 3, 12], ["One-Arm Dumbbell Row", 4, 10], ["Lateral Raise", 3, 15], ["Rear Delt Fly", 3, 15], ["Incline Dumbbell Curl", 3, 12]] },
  { name: "Home · Dumbbell Lower A", category: home, exercises: [["Bulgarian Split Squat", 4, 10], ["Walking Lunge", 3, 12], ["Plank", 3, 45, 60]] },
  { name: "Home · Dumbbell Lower B", category: home, exercises: [["Walking Lunge", 4, 12], ["Bulgarian Split Squat", 3, 12], ["Burpee", 3, 10], ["Plank", 3, 60, 60]] },

  { name: "Conditioning · Row & Core", category: conditioning, exercises: [["Rowing Machine", 3, 300, 60], ["Plank", 3, 45, 60], ["Cable Crunch", 3, 15]] },
  { name: "Conditioning · Bike & Legs", category: conditioning, exercises: [["Stationary Bike", 3, 300, 60], ["Walking Lunge", 3, 12], ["Standing Calf Raise", 3, 15]] },
  { name: "Conditioning · Run & Core", category: conditioning, exercises: [["Treadmill Run", 3, 300, 60], ["Hanging Leg Raise", 3, 10], ["Plank", 3, 45, 60]] },
  { name: "Conditioning · Kettlebell", category: conditioning, exercises: [["Kettlebell Swing", 4, 15], ["Burpee", 4, 10], ["Jump Rope", 4, 60, 60], ["Plank", 3, 45, 60]] },
];

export function formFromTemplate(template: RoutineTemplate, catalog: Pick<Exercise, "id" | "name" | "tracking">[]): RoutineFormInput | null {
  const byName = new Map(catalog.map((exercise) => [exercise.name, exercise]));
  const exercises = template.exercises.map(([name, count, target, rest]) => {
    const exercise = byName.get(name);
    if (!exercise) return null;
    const entry = newExerciseEntry(exercise);
    return {
      ...entry,
      rest_seconds: rest ?? 90,
      sets: Array.from({ length: count }, () => ({
        kind: "normal" as const,
        reps: exercise.tracking === "reps" || exercise.tracking === "weight_reps" ? target : "",
        weight: "",
        duration_seconds: exercise.tracking === "duration" || exercise.tracking === "distance_duration" ? target : "",
        distance: "",
      })),
    };
  });
  if (exercises.some((exercise) => exercise === null)) return null;
  return { name: template.name, notes: "", exercises: exercises.filter((exercise) => exercise !== null) };
}

export function fillTemplateWeights(form: RoutineFormInput, histories: Map<string, ExerciseHistory>, unit: WeightUnit): RoutineFormInput {
  return {
    ...form,
    exercises: form.exercises.map((exercise) => {
      if (exercise.tracking !== "weight_reps") return exercise;
      const session = histories.get(exercise.exercise_id)?.sessions.find((candidate) =>
        candidate.sets.some((set) => set.kind === "normal" && set.weight_kg !== null),
      );
      const weights = session?.sets.flatMap((set) => set.kind === "normal" && set.weight_kg !== null ? [set.weight_kg] : []);
      if (!weights?.length) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, index) => {
          const weight = weights[Math.min(index, weights.length - 1)];
          return { ...set, weight: weight === undefined ? "" : Number(trimNumber(kgTo(unit, weight), 2)) };
        }),
      };
    }),
  };
}
