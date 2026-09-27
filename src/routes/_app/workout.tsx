import { createFileRoute } from "@tanstack/react-router";

import { ActiveWorkout } from "@/features/workouts/components/active-workout";
import { StartWorkout } from "@/features/workouts/components/start-workout";
import { useWorkoutStore } from "@/features/workouts/store";

export const Route = createFileRoute("/_app/workout")({
  component: WorkoutPage,
});

function WorkoutPage() {
  const active = useWorkoutStore((state) => state.active);
  return active ? <ActiveWorkout workout={active} /> : <StartWorkout />;
}
