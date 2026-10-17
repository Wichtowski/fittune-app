import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { type DraftExercise, type DraftWorkout, exerciseFromRef } from "../draft";
import { useWorkoutStore } from "../store";
import { fittune } from "@/api/fittune";
import { queryKeys } from "@/api/query-keys";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { ExercisePicker } from "@/features/exercises/components/exercise-picker";
import { t } from "@/lib/i18n";
import type { RoutineInput } from "@/schemas/routine";

export function AddWorkoutExercises({ workout, open, onOpenChange }: {
  workout: DraftWorkout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [added, setAdded] = useState<DraftExercise[]>([]);
  const save = useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: async ({ routineId, exercises, token }: { routineId: string; exercises: DraftExercise[]; token: string | null }) => {
      const sessionIsCurrent = () => useSession.getState().token === token;
      if (!sessionIsCurrent()) throw new Error("Session changed");
      // Read the current plan so edits made since starting the workout are preserved.
      const routine = await fittune.getRoutine(routineId);
      if (!sessionIsCurrent()) throw new Error("Session changed");
      const known = new Set(routine.exercises.map((exercise) => exercise.exercise_id));
      const additions = exercises.filter((exercise) => {
        if (known.has(exercise.exercise_id)) return false;
        known.add(exercise.exercise_id);
        return true;
      });
      // Also makes retrying after an uncertain response safe from duplicates.
      if (additions.length === 0) return routine;
      const input: RoutineInput = {
        name: routine.name,
        notes: routine.notes,
        exercises: [...routine.exercises, ...additions].map((exercise) => ({
          exercise_id: exercise.exercise_id,
          notes: exercise.notes,
          rest_seconds: exercise.rest_seconds,
          sets: exercise.sets.map(({ kind, reps, weight_kg, duration_seconds, distance_m }) => ({
            kind, reps, weight_kg, duration_seconds, distance_m,
          })),
        })),
      };
      return fittune.updateRoutine(routineId, input);
    },
    onSuccess: (routine, { token }) => {
      if (useSession.getState().token !== token) return;
      queryClient.setQueryData(queryKeys.routines.detail(routine.id), routine);
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.list });
      setAdded([]);
      toast.success(t("Exercises saved to routine"));
    },
  });

  return (
    <>
      <ExercisePicker
        place={workout.place}
        open={open}
        onOpenChange={onOpenChange}
        onPick={(exercises) => {
          const store = useWorkoutStore.getState();
          if (store.active?.id !== workout.id || store.discardingId || exercises.length === 0) return;
          const additions = exercises.map((exercise) => exerciseFromRef({
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            tracking: exercise.tracking,
            primary_muscle: exercise.primary_muscle,
          }));
          store.edit((current) => ({ ...current, exercises: [...current.exercises, ...additions] }));
          if (workout.routine_id) {
            save.reset();
            setAdded(additions);
          }
        }}
      />
      <AlertDialog open={added.length > 0} onOpenChange={(next) => { if (!next && !save.isPending) setAdded([]); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Also save exercises to the routine?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("The exercises are added to this workout. Save them to the routine to include them next time, too.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-40 overflow-y-auto text-sm">
            {added.map((exercise) => <li key={exercise.id}>{exercise.exercise_name}</li>)}
          </ul>
          {save.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {t("Couldn't save exercises to the routine. They are kept in this workout. Try again when you're online.")}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={save.isPending}>{t("Only this workout")}</AlertDialogCancel>
            <Button disabled={save.isPending} onClick={() => {
              if (workout.routine_id && !save.isPending) {
                save.mutate({ routineId: workout.routine_id, exercises: added, token: useSession.getState().token });
              }
            }}>
              {save.isPending ? t("Saving…") : t("Save to routine")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
