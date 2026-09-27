import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { routineQuery } from "@/api/routines";
import { PageHeader } from "@/components/layout/page-header";
import { QueryError } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { RoutineEditor } from "@/features/routines/components/routine-editor";

export const Route = createFileRoute("/_app/routines/$routineId")({
  loader: ({ context, params }) => void context.queryClient.prefetchQuery(routineQuery(params.routineId)),
  component: EditRoutinePage,
});

function EditRoutinePage() {
  const { routineId } = Route.useParams();
  const { data, error, refetch } = useQuery(routineQuery(routineId));

  return (
    <>
      <PageHeader title={data?.name ?? "Routine"} eyebrow="Edit routine" />
      {data ? (
        <RoutineEditor key={data.id} routine={data} />
      ) : error ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <Skeleton className="h-96" />
      )}
    </>
  );
}
