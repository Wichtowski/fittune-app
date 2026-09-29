import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { WorkoutDetail } from "@/features/workouts/components/workout-detail";

export const Route = createFileRoute("/_app/workouts/$workoutId")({
  staticData: { app: "train" },
  validateSearch: z.object({ completed: z.boolean().optional() }),
  component: WorkoutDetailPage,
});

function WorkoutDetailPage() {
  const { workoutId } = Route.useParams();
  const { completed } = Route.useSearch();
  return <WorkoutDetail workoutId={workoutId} justCompleted={Boolean(completed)} />;
}
