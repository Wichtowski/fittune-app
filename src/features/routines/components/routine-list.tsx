import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipboardListIcon, PencilIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";

import { routinesQuery } from "@/api/routines";
import { EmptyState } from "@/components/empty-state";
import { QueryError, QueryFallback } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { workoutFromRoutine } from "@/features/workouts/draft";
import { useWorkoutStore } from "@/features/workouts/store";
import { formatDay } from "@/lib/format";
import { muscleLabels } from "@/lib/labels";

export function RoutineList() {
  const { data, error, isPending, fetchStatus, refetch } = useQuery(routinesQuery());
  const start = useWorkoutStore((state) => state.start);
  const hasActive = useWorkoutStore((state) => state.active !== null);
  const navigate = useNavigate();

  if (isPending) {
    return (
      <QueryFallback query={{ error, fetchStatus, refetch }}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </QueryFallback>
    );
  }
  if (error && !data) return <QueryError error={error} onRetry={() => void refetch()} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={ClipboardListIcon}
        title="Plan your first routine"
        description="Pick exercises and target sets once, then start the session in one tap at the gym."
        action={
          <Button asChild size="sm">
            <Link to="/routines/new">Create routine</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((routine) => {
        const totalSets = routine.exercises.reduce((n, e) => n + e.sets.length, 0);
        const muscles = [...new Set(routine.exercises.map((e) => muscleLabels[e.primary_muscle]))];
        return (
          <li key={routine.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{routine.name}</p>
              <p className="text-sm text-muted-foreground">
                {routine.exercises.length} exercises · {totalSets} sets
                {routine.last_performed_at ? ` · last ${formatDay(routine.last_performed_at)}` : " · not done yet"}
              </p>
              <ol className="mt-3 grid gap-1 text-sm">
                {routine.exercises.slice(0, 5).map((exercise) => (
                  <li key={exercise.id} className="flex justify-between gap-2">
                    <span className="truncate">{exercise.exercise_name}</span>
                    <span className="shrink-0 text-muted-foreground tabular">{exercise.sets.length} sets</span>
                  </li>
                ))}
                {routine.exercises.length > 5 ? (
                  <li className="text-muted-foreground">+{routine.exercises.length - 5} more</li>
                ) : null}
              </ol>
              {muscles.length > 0 ? <p className="mt-3 text-xs text-muted-foreground">{muscles.join(" · ")}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (hasActive) {
                    toast.error("Finish or discard your current workout first.");
                    return;
                  }
                  start(workoutFromRoutine(routine));
                  void navigate({ to: "/workout" });
                }}
              >
                <PlayIcon className="size-4 fill-current" aria-hidden /> Start
              </Button>
              <Button asChild variant="secondary" size="icon" aria-label={`Edit ${routine.name}`}>
                <Link to="/routines/$routineId" params={{ routineId: routine.id }}>
                  <PencilIcon className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
