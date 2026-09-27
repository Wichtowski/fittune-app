import { createFileRoute } from "@tanstack/react-router";

import { exerciseHistoryQuery } from "@/api/exercises";
import { ExerciseDetail } from "@/features/exercises/components/exercise-detail";

export const Route = createFileRoute("/_app/exercises/$exerciseId")({
  loader: ({ context, params }) => void context.queryClient.prefetchQuery(exerciseHistoryQuery(params.exerciseId)),
  component: ExerciseDetailPage,
});

function ExerciseDetailPage() {
  const { exerciseId } = Route.useParams();
  return <ExerciseDetail exerciseId={exerciseId} />;
}
