import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { DumbbellIcon } from "lucide-react";
import { useMemo } from "react";

import { WorkoutSummaryCard } from "./workout-summary-card";
import { workoutsInfiniteQuery } from "@/api/workouts";
import { EmptyState } from "@/components/empty-state";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDay, formatDuration, formatMonth, formatTime } from "@/lib/format";
import { formatVolume } from "@/lib/units";
import type { WorkoutSummary } from "@/schemas/workout";

function groupByMonth(workouts: WorkoutSummary[]) {
  const groups = new Map<string, WorkoutSummary[]>();
  for (const workout of workouts) {
    const key = workout.started_at.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), workout]);
  }
  return [...groups.entries()];
}

/** Completed workouts, newest first: cards on phones, a dense table on desktop. */
export function WorkoutHistory() {
  const { weightUnit } = usePreferences();
  const query = useInfiniteQuery(workoutsInfiniteQuery("completed"));
  const workouts = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const groups = useMemo(() => groupByMonth(workouts), [workouts]);

  if (query.isPending) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  if (query.error && workouts.length === 0) return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={DumbbellIcon}
        title="No workouts yet"
        description="Finished workouts show up here with their volume and sets."
        action={
          <Button asChild size="sm">
            <Link to="/workout">Start a workout</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-8">
      {groups.map(([month, items]) => (
        <section key={month} aria-label={formatMonth(`${month}-01T12:00:00`)}>
          <h2 className="mb-3 flex items-baseline justify-between font-display text-xl font-bold tracking-wide uppercase">
            {formatMonth(`${month}-01T12:00:00`)}
            <span className="font-sans text-sm font-normal tracking-normal text-muted-foreground normal-case">
              {items.length} workout{items.length === 1 ? "" : "s"}
            </span>
          </h2>

          <ul className="grid gap-3 md:hidden">
            {items.map((workout) => (
              <li key={workout.id}>
                <WorkoutSummaryCard workout={workout} weightUnit={weightUnit} />
              </li>
            ))}
          </ul>

          <table className="hidden w-full overflow-hidden rounded-2xl border bg-card text-sm md:table">
            <thead className="text-left text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                <th>Date</th>
                <th>Workout</th>
                <th className="text-right">Duration</th>
                <th className="text-right">Sets</th>
                <th className="text-right">Reps</th>
                <th className="text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {items.map((workout) => (
                <tr key={workout.id} className="border-t transition-colors hover:bg-accent/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="whitespace-nowrap text-muted-foreground">
                    {formatDay(workout.started_at)} · {formatTime(workout.started_at)}
                  </td>
                  <td className="max-w-md">
                    <Link
                      to="/workouts/$workoutId"
                      params={{ workoutId: workout.id }}
                      className="font-semibold hover:text-primary-strong hover:underline"
                    >
                      {workout.title}
                    </Link>
                    <p className="truncate text-muted-foreground">{workout.exercise_names.join(", ")}</p>
                  </td>
                  <td className="text-right">{formatDuration(workout.duration_seconds)}</td>
                  <td className="text-right">{workout.set_count}</td>
                  <td className="text-right">{workout.total_reps.toLocaleString()}</td>
                  <td className="text-right font-semibold">{formatVolume(workout.volume_kg, weightUnit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {query.hasNextPage ? (
        <Button variant="secondary" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
