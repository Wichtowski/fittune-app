import { type InfiniteData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipboardPlusIcon, EllipsisIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type DraftWorkout, totals, workoutFromPrevious } from "../draft";
import { setLabels, summariseSet } from "../previous";
import { useWorkoutStore } from "../store";
import { SyncIndicator } from "./sync-indicator";
import { queryKeys } from "@/api/query-keys";
import { createRoutine } from "@/api/routines";
import { deleteWorkout, workoutQuery } from "@/api/workouts";
import { PageHeader } from "@/components/layout/page-header";
import { QueryError } from "@/components/query-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { muscleLabels } from "@/lib/labels";
import { formatVolume } from "@/lib/units";
import type { Page } from "@/schemas/common";
import type { Workout, WorkoutSummary } from "@/schemas/workout";

type Viewable = Pick<Workout, "id" | "title" | "notes" | "started_at" | "ended_at" | "routine_id" | "exercises">;

export function WorkoutDetail({ workoutId }: { workoutId: string }) {
  // A workout finished offline is shown from the device until the server has it.
  const local = useWorkoutStore((state) => state.outbox.find((w) => w.id === workoutId));
  const query = useQuery({ ...workoutQuery(workoutId), enabled: !local });
  const workout: Viewable | undefined = local ?? query.data;

  if (!workout) {
    if (query.error) return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
    return (
      <div className="grid gap-3 pt-8">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  return <WorkoutView workout={workout} local={local} />;
}

function WorkoutView({ workout, local }: { workout: Viewable; local: DraftWorkout | undefined }) {
  const preferences = usePreferences();
  const summary = totals(workout);
  const duration = workout.ended_at
    ? (new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 1000
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`${formatDate(workout.started_at)} · ${formatTime(workout.started_at)}`}
        title={workout.title}
        actions={<WorkoutActions workout={workout} canEdit={!local} />}
      />
      {local ? <SyncIndicator className="mb-4" /> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Duration" value={formatDuration(duration)} />
        <StatTile label="Volume" value={formatVolume(summary.volumeKg, preferences.weightUnit)} />
        <StatTile label="Sets" value={String(summary.completedSets)} />
        <StatTile label="Reps" value={summary.reps.toLocaleString()} />
      </div>

      {workout.notes ? <p className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm whitespace-pre-wrap">{workout.notes}</p> : null}

      <div className="mt-6 grid gap-3">
        {workout.exercises.map((exercise) => {
          const labels = setLabels(exercise.sets.map((set) => set.kind));
          return (
            <section key={exercise.id} className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <Link
                  to="/exercises/$exerciseId"
                  params={{ exerciseId: exercise.exercise_id }}
                  className="truncate text-lg font-semibold text-primary-strong hover:underline"
                >
                  {exercise.exercise_name}
                </Link>
                <span className="shrink-0 text-sm text-muted-foreground">{muscleLabels[exercise.primary_muscle]}</span>
              </div>
              {exercise.notes ? <p className="mb-2 text-sm text-muted-foreground">{exercise.notes}</p> : null}
              <ol className="grid gap-1">
                {exercise.sets.map((set, i) => (
                  <li
                    key={set.id}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 tabular ${set.completed ? "" : "opacity-50"}`}
                  >
                    <span className="w-6 text-center font-display font-bold text-muted-foreground">{labels[i]}</span>
                    <span className="font-medium">{summariseSet(set, exercise.tracking, preferences) ?? "—"}</span>
                    {set.rpe ? <span className="text-sm text-muted-foreground">RPE {set.rpe}</span> : null}
                    {!set.completed ? <span className="ml-auto text-xs text-muted-foreground">not done</span> : null}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function WorkoutActions({ workout, canEdit }: { workout: Viewable; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const hasActive = useWorkoutStore((state) => state.active !== null);
  const start = useWorkoutStore((state) => state.start);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteWorkout(workout.id),
    onMutate: async () => {
      // Optimistically drop it from every cached history page.
      await queryClient.cancelQueries({ queryKey: queryKeys.workouts.all });
      const snapshot = queryClient.getQueriesData<InfiniteData<Page<WorkoutSummary>>>({ queryKey: queryKeys.workouts.all });
      queryClient.setQueriesData<InfiniteData<Page<WorkoutSummary>>>({ queryKey: ["workouts", "list"] }, (data) =>
        data
          ? { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.filter((w) => w.id !== workout.id) })) }
          : data,
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error("Couldn't delete the workout.");
    },
    onSuccess: () => {
      void navigate({ to: "/workouts", replace: true });
      toast.success("Workout deleted");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });

  const saveAsRoutine = useMutation({
    mutationFn: () =>
      createRoutine({
        name: workout.title,
        notes: null,
        exercises: workout.exercises.map((exercise) => ({
          exercise_id: exercise.exercise_id,
          rest_seconds: exercise.rest_seconds,
          notes: exercise.notes,
          sets: exercise.sets.map(({ kind, reps, weight_kg, duration_seconds, distance_m }) => ({
            kind,
            reps,
            weight_kg,
            duration_seconds,
            distance_m,
          })),
        })),
      }),
    onSuccess: (routine) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      toast.success("Saved as routine");
      void navigate({ to: "/routines/$routineId", params: { routineId: routine.id } });
    },
    onError: () => toast.error("Couldn't save the routine."),
  });

  const repeat = () => {
    if (hasActive) {
      toast.error("Finish or discard your current workout first.");
      return;
    }
    start(workoutFromPrevious({ ...workout, revision: 0, created_at: "", updated_at: "" }));
    void navigate({ to: "/workout" });
  };

  return (
    <>
      <Button size="sm" onClick={repeat} className="hidden sm:inline-flex">
        <RotateCcwIcon className="size-4" aria-hidden /> Repeat
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon-sm" aria-label="Workout actions">
            <EllipsisIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={repeat}>
            <RotateCcwIcon aria-hidden /> Repeat workout
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canEdit || saveAsRoutine.isPending} onSelect={() => saveAsRoutine.mutate()}>
            <ClipboardPlusIcon aria-hidden /> Save as routine
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={!canEdit || remove.isPending} onSelect={() => setConfirmDelete(true)}>
            <Trash2Icon aria-hidden /> Delete workout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from your history and stats. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => remove.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
