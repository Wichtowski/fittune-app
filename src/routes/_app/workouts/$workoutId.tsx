import { createFileRoute } from "@tanstack/react-router";

import { WorkoutDetail } from "@/features/workouts/components/workout-detail";

export const Route = createFileRoute("/_app/workouts/$workoutId")({
  component: WorkoutDetailPage,
});

function WorkoutDetailPage() {
  const { workoutId } = Route.useParams();
  return <WorkoutDetail workoutId={workoutId} />;
}
