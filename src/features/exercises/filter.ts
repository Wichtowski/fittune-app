import type { Equipment, EquipmentItem, Muscle } from "@/schemas/common";
import type { Exercise } from "@/schemas/exercise";

export type ExerciseFilter = { q?: string; muscle?: Muscle; equipment?: Equipment; customOnly?: boolean; availableEquipment?: readonly EquipmentItem[] };

function normalise(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Client-side search over the exercise library: every word must appear in the name, so
 * "db press" finds "Incline Dumbbell Press" via the "db" alias.
 */
/** An exercise can be done where every piece of equipment it requires is available */
export function canDoWith(exercise: Pick<Exercise, "requires">, available: readonly EquipmentItem[]) {
  return exercise.requires.every((item) => available.includes(item));
}

export function filterExercises(exercises: Exercise[], filter: ExerciseFilter): Exercise[] {
  const words = normalise(filter.q ?? "")
    .split(" ")
    .filter(Boolean)
    .map((word) => ALIASES[word] ?? word);

  return exercises.filter((exercise) => {
    if (filter.availableEquipment && !canDoWith(exercise, filter.availableEquipment)) return false;
    if (filter.customOnly && !exercise.is_custom) return false;
    if (filter.equipment && exercise.equipment !== filter.equipment) return false;
    if (filter.muscle && exercise.primary_muscle !== filter.muscle && !exercise.secondary_muscles.includes(filter.muscle)) {
      return false;
    }
    if (words.length === 0) return true;
    const name = normalise(exercise.name);
    return words.every((word) => name.includes(word));
  });
}

const ALIASES: Record<string, string> = {
  db: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
  ohp: "overhead press",
  rdl: "romanian deadlift",
};
