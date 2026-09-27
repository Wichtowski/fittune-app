import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  NotebookPenIcon,
  PlusIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

import { type DraftExercise, type DraftSet, edits, isSetLogged } from "../draft";
import { previousSets, setLabels, summariseSet } from "../previous";
import { useWorkoutStore } from "../store";
import { SET_GRID, SetRow } from "./set-row";
import { exerciseHistoryQuery } from "@/api/exercises";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDuration } from "@/lib/format";
import { muscleLabels } from "@/lib/labels";
import type { SetKind } from "@/schemas/common";

const REST_OPTIONS = [0, 30, 60, 90, 120, 180, 300];

type ExerciseCardProps = {
  workoutId: string;
  exercise: DraftExercise;
  index: number;
  count: number;
};

export const ExerciseCard = memo(function ExerciseCard({ workoutId, exercise, index, count }: ExerciseCardProps) {
  const edit = useWorkoutStore((state) => state.edit);
  const startRest = useWorkoutStore((state) => state.startRest);
  const preferences = usePreferences();
  const [showNotes, setShowNotes] = useState(exercise.notes !== null);
  const { data: history } = useQuery({ ...exerciseHistoryQuery(exercise.exercise_id), staleTime: 10 * 60_000 });

  const previous = useMemo(() => previousSets(history, workoutId), [history, workoutId]);
  const labels = useMemo(() => setLabels(exercise.sets.map((set) => set.kind)), [exercise.sets]);
  const exerciseId = exercise.id;

  const onChange = useCallback(
    (setId: string, patch: Partial<Omit<DraftSet, "id">>) => edit(edits.updateSet(exerciseId, setId, patch)),
    [edit, exerciseId],
  );
  const onKind = useCallback((setId: string, kind: SetKind) => edit(edits.setKind(exerciseId, setId, kind)), [edit, exerciseId]);
  const onRemove = useCallback((setId: string) => edit(edits.removeSet(exerciseId, setId)), [edit, exerciseId]);

  const onUsePrevious = useCallback(
    (setId: string) => {
      const setIndex = exercise.sets.findIndex((set) => set.id === setId);
      const values = previous[setIndex];
      if (!values) return;
      edit(
        edits.updateSet(exerciseId, setId, {
          reps: values.reps,
          weight_kg: values.weight_kg,
          duration_seconds: values.duration_seconds,
          distance_m: values.distance_m,
        }),
      );
    },
    [edit, exerciseId, exercise.sets, previous],
  );

  const onToggleComplete = useCallback(
    (set: DraftSet) => {
      const completing = !set.completed;
      const setIndex = exercise.sets.findIndex((s) => s.id === set.id);
      const fallback = previous[setIndex];
      // Ticking an empty set logs what you did last time, like on paper.
      const patch =
        completing && !isSetLogged(set) && fallback
          ? {
              completed: true,
              reps: fallback.reps,
              weight_kg: fallback.weight_kg,
              duration_seconds: fallback.duration_seconds,
              distance_m: fallback.distance_m,
            }
          : { completed: completing };
      edit(edits.updateSet(exerciseId, set.id, patch));
      if (completing) {
        navigator.vibrate?.(15);
        startRest(exerciseId, exercise.rest_seconds ?? 0);
      }
    },
    [edit, startRest, exerciseId, exercise.sets, exercise.rest_seconds, previous],
  );

  const columns =
    exercise.tracking === "weight_reps"
      ? [preferences.weightUnit, "Reps"]
      : exercise.tracking === "reps"
        ? ["", "Reps"]
        : exercise.tracking === "duration"
          ? ["", "Time"]
          : [preferences.distanceUnit, "Time"];

  return (
    <section className="rounded-2xl border bg-card p-3 md:p-4" aria-label={exercise.exercise_name}>
      <header className="mb-2 flex items-start gap-2 px-1">
        <div className="min-w-0 flex-1">
          <Link
            to="/exercises/$exerciseId"
            params={{ exerciseId: exercise.exercise_id }}
            className="block truncate text-lg leading-tight font-semibold text-primary-strong hover:underline"
          >
            {exercise.exercise_name}
          </Link>
          <p className="text-sm text-muted-foreground">{muscleLabels[exercise.primary_muscle]}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <TimerIcon className="size-4" aria-hidden />
              {exercise.rest_seconds ? formatDuration(exercise.rest_seconds) : "Off"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Rest timer</DropdownMenuLabel>
            {REST_OPTIONS.map((seconds) => (
              <DropdownMenuItem key={seconds} onSelect={() => edit(edits.setRest(exerciseId, seconds || null))}>
                {seconds === 0 ? "Off" : formatDuration(seconds)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${exercise.exercise_name} options`}>
              <EllipsisVerticalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => edit(edits.moveExercise(exerciseId, -1))}>
              <ArrowUpIcon aria-hidden /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => edit(edits.moveExercise(exerciseId, 1))}>
              <ArrowDownIcon aria-hidden /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShowNotes(true)}>
              <NotebookPenIcon aria-hidden /> Add note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => edit(edits.removeExercise(exerciseId))}>
              <Trash2Icon aria-hidden /> Remove exercise
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {showNotes ? (
        <Textarea
          defaultValue={exercise.notes ?? ""}
          onBlur={(event) => edit(edits.setExerciseNotes(exerciseId, event.target.value))}
          placeholder="Notes: seat height, grip, how it felt…"
          className="mb-2 min-h-16 text-sm"
          aria-label="Exercise notes"
        />
      ) : null}

      <div className={`${SET_GRID} px-1.5 pb-1 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase`}>
        <span className="text-center">Set</span>
        <span>Previous</span>
        <span className="text-center">{columns[0]}</span>
        <span className="text-center">{columns[1]}</span>
        <span className="sr-only">Done</span>
      </div>

      <div className="grid gap-1">
        {exercise.sets.map((set, i) => {
          const prev = previous[i];
          return (
            <SetRow
              key={set.id}
              set={set}
              label={labels[i] ?? String(i + 1)}
              tracking={exercise.tracking}
              previous={prev ? summariseSet(prev, exercise.tracking, preferences) : null}
              weightUnit={preferences.weightUnit}
              distanceUnit={preferences.distanceUnit}
              onChange={onChange}
              onToggleComplete={onToggleComplete}
              onKind={onKind}
              onRemove={onRemove}
              onUsePrevious={onUsePrevious}
            />
          );
        })}
      </div>

      <Button variant="secondary" className="mt-2 w-full" onClick={() => edit(edits.addSet(exerciseId))}>
        <PlusIcon aria-hidden /> Add set
      </Button>
    </section>
  );
});
