import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArchiveIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ExerciseForm } from "./exercise-form";
import { archiveExercise, exerciseHistoryQuery } from "@/api/exercises";
import { queryKeys } from "@/api/query-keys";
import { PageHeader } from "@/components/layout/page-header";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/features/analytics/components/chart-card";
import { TrendLineChart } from "@/features/analytics/components/line-chart";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { setLabels, summariseSet } from "@/features/workouts/previous";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDay, formatDuration, formatShortDate } from "@/lib/format";
import { difficultyLabels, equipmentLabels, muscleLabels, trackingLabels } from "@/lib/labels";
import { formatDistance, formatVolume, formatWeight, kgTo, metresTo, trimNumber } from "@/lib/units";
import type { ExerciseHistory } from "@/schemas/exercise";

export function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const query = useQuery(exerciseHistoryQuery(exerciseId));
  if (query.error && !query.data) return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div className="grid gap-3 pt-8">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  return <ExerciseView history={query.data} />;
}

function ExerciseView({ history }: { history: ExerciseHistory }) {
  const { exercise, records, sessions } = history;
  const preferences = usePreferences();
  const { weightUnit, distanceUnit } = preferences;
  const [editing, setEditing] = useState(false);
  const trend = trendSeries(history, preferences);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/exercises" className="hover:underline">
            Exercises
          </Link>
        }
        title={exercise.name}
        actions={exercise.is_custom && !exercise.archived_at ? <CustomActions history={history} onEdit={() => setEditing(true)} /> : null}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge>{muscleLabels[exercise.primary_muscle]}</Badge>
        {exercise.secondary_muscles.map((m) => (
          <Badge key={m} variant="outline">
            {muscleLabels[m]}
          </Badge>
        ))}
        <Badge variant="secondary">{equipmentLabels[exercise.equipment]}</Badge>
        <Badge variant="secondary">{difficultyLabels[exercise.difficulty]}</Badge>
        {exercise.archived_at ? <Badge variant="destructive">Archived</Badge> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {exercise.tracking === "weight_reps" ? (
          <>
            <StatTile label="Heaviest weight" value={formatWeight(records.max_weight_kg?.value, weightUnit)} />
            <StatTile label="Best est. 1RM" value={formatWeight(records.best_e1rm_kg?.value, weightUnit)} />
            <StatTile label="Most reps" value={records.max_reps ? String(records.max_reps.value) : "–"} />
            <StatTile
              label="Best session volume"
              value={records.best_session_volume_kg ? formatVolume(records.best_session_volume_kg.value, weightUnit) : "–"}
            />
          </>
        ) : exercise.tracking === "reps" ? (
          <>
            <StatTile label="Most reps" value={records.max_reps ? String(records.max_reps.value) : "–"} />
            <StatTile label="Sessions" value={String(sessions.length)} />
          </>
        ) : (
          <>
            <StatTile label="Longest" value={formatDuration(records.max_duration_seconds?.value)} />
            {exercise.tracking === "distance_duration" ? (
              <StatTile label="Farthest" value={formatDistance(records.max_distance_m?.value, distanceUnit)} />
            ) : null}
            <StatTile label="Sessions" value={String(sessions.length)} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-4 lg:col-span-2">
          {trend.data.length > 1 ? (
            <ChartCard
              title={trend.title}
              description="Best set per session"
              table={{ columns: ["Session", trend.title], rows: trend.data.map((d) => [d.tooltipTitle ?? d.label, trend.format(d.value)]) }}
            >
              <TrendLineChart data={trend.data} seriesLabel={trend.title} formatValue={trend.format} />
            </ChartCard>
          ) : null}

          <section>
            <h2 className="mb-3 font-display text-xl font-bold tracking-wide uppercase">History</h2>
            {sessions.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                You haven't logged this exercise yet.
              </p>
            ) : (
              <ul className="grid gap-3">
                {sessions.map((session) => {
                  const labels = setLabels(session.sets.map((s) => s.kind));
                  return (
                    <li key={session.workout_id}>
                      <Link
                        to="/workouts/$workoutId"
                        params={{ workoutId: session.workout_id }}
                        className="block rounded-2xl border bg-card p-4 hover:bg-accent/50"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-semibold">{session.workout_title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDay(session.started_at)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular">
                          {session.sets.map((set, i) => (
                            <span key={i} className={set.kind === "warmup" ? "text-muted-foreground" : ""}>
                              <span className="mr-1 text-xs text-muted-foreground">{labels[i]}</span>
                              {summariseSet(set, exercise.tracking, preferences)}
                            </span>
                          ))}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-4">
          {exercise.video_id ? (
            <Card className="overflow-hidden">
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube-nocookie.com/embed/${exercise.video_id}`}
                title={`${exercise.name} demo`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </Card>
          ) : null}
          <Card className="p-5">
            <h3 className="font-semibold">How it's tracked</h3>
            <p className="mt-1 text-sm text-muted-foreground">{trackingLabels[exercise.tracking]}</p>
            {exercise.instructions ? (
              <p className="mt-4 text-sm whitespace-pre-wrap">{exercise.instructions}</p>
            ) : null}
          </Card>
        </aside>
      </div>

      <ResponsiveDialog open={editing} onOpenChange={setEditing} title="Edit exercise">
        <ExerciseForm exercise={exercise} onDone={() => setEditing(false)} />
      </ResponsiveDialog>
    </>
  );
}

function CustomActions({ history, onEdit }: { history: ExerciseHistory; onEdit: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const archive = useMutation({
    mutationFn: () => archiveExercise(history.exercise.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.all });
      toast.success("Exercise archived. Past workouts keep it.");
      void navigate({ to: "/exercises" });
    },
    onError: () => toast.error("Couldn't archive the exercise."),
  });

  return (
    <>
      <Button variant="secondary" size="icon-sm" onClick={onEdit} aria-label="Edit exercise">
        <PencilIcon className="size-4" aria-hidden />
      </Button>
      <Button
        variant="secondary"
        size="icon-sm"
        disabled={archive.isPending}
        onClick={() => archive.mutate()}
        aria-label="Archive exercise"
      >
        <ArchiveIcon className="size-4" aria-hidden />
      </Button>
    </>
  );
}

function trendSeries(history: ExerciseHistory, units: ReturnType<typeof usePreferences>) {
  const sessions = [...history.sessions].reverse();
  const point = (s: (typeof sessions)[number], value: number | null) =>
    value == null
      ? null
      : { key: s.workout_id, label: formatShortDate(s.started_at), value, tooltipTitle: formatDay(s.started_at) };
  const compact = <T,>(items: (T | null)[]) => items.filter((x): x is T => x !== null);

  switch (history.exercise.tracking) {
    case "weight_reps":
      return {
        title: "Estimated 1RM",
        data: compact(sessions.map((s) => point(s, s.best_e1rm_kg == null ? null : kgTo(units.weightUnit, s.best_e1rm_kg)))),
        format: (v: number) => `${trimNumber(v, 1)} ${units.weightUnit}`,
      };
    case "reps":
      return {
        title: "Total reps",
        data: compact(sessions.map((s) => point(s, s.total_reps))),
        format: (v: number) => `${v} reps`,
      };
    case "duration":
      return {
        title: "Longest set",
        data: compact(sessions.map((s) => point(s, s.max_duration_seconds))),
        format: (v: number) => formatDuration(v),
      };
    case "distance_duration":
      return {
        title: "Farthest set",
        data: compact(sessions.map((s) => point(s, s.max_distance_m == null ? null : metresTo(units.distanceUnit, s.max_distance_m)))),
        format: (v: number) => `${trimNumber(v, 2)} ${units.distanceUnit}`,
      };
  }
}
