import { useQueryClient } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { EllipsisIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type DraftWorkout, edits, totals } from "../draft";
import { useWorkoutStore } from "../store";
import { SYNC_MUTATION_KEY, useDiscardWorkout } from "../use-workout-sync";
import { ExerciseCard } from "./exercise-card";
import { FinishWorkoutDialog } from "./finish-workout-dialog";
import { RestTimer } from "./rest-timer";
import { SyncIndicator } from "./sync-indicator";
import { useSession } from "@/features/auth/session";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { PlacePicker } from "@/features/places/components/place-picker";
import { ExercisePicker } from "@/features/exercises/components/exercise-picker";
import { useNow } from "@/hooks/use-now";
import { usePreferences } from "@/hooks/use-preferences";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { formatClock } from "@/lib/format";
import { formatVolume } from "@/lib/units";

export function ActiveWorkout({ workout }: { workout: DraftWorkout }) {
  const edit = useWorkoutStore((state) => state.edit);
  const discarding = useWorkoutStore((state) => state.discardingId === workout.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const now = useNow();
  const { weightUnit } = usePreferences();
  useWakeLock(true);

  const elapsed = (now - new Date(workout.started_at).getTime()) / 1000;
  const summary = totals(workout);

  return (
    <fieldset disabled={discarding} className="mx-auto min-w-0 max-w-2xl">
      <header className="sticky top-0 z-30 -mx-4 bg-background/90 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 backdrop-blur-xl md:static md:mx-0 md:px-0 md:pt-8">
        <div className="flex items-center gap-2">
          <input
            defaultValue={workout.title}
            key={workout.id}
            onBlur={(event) => {
              const title = event.target.value.trim();
              if (title && title !== workout.title) edit(edits.rename(title));
            }}
            aria-label={t("Workout title")}
            className="min-w-0 flex-1 truncate bg-transparent font-display text-2xl font-bold tracking-wide uppercase outline-none focus:underline md:text-3xl"
          />
          <FinishWorkoutDialog workout={workout} />
          <WorkoutMenu onDiscard={() => setConfirmDiscard(true)} />
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label={t("Time")} value={formatClock(elapsed)} accent />
          <Stat label={t("Volume")} value={formatVolume(summary.volumeKg, weightUnit)} />
          <Stat label={t("Sets")} value={`${summary.completedSets}/${summary.totalSets}`} />
        </dl>
        <SyncIndicator className="mt-2 justify-center" />
      </header>

      <PlacePicker value={workout.place} onChange={(place) => edit(edits.setPlace(place))} />

      {/* One shrinkable column: an auto one grows to its widest card and pushes it off a phone */}
      <div className="mt-2 grid grid-cols-1 gap-3">
        {workout.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            workoutId={workout.id}
            exercise={exercise}
            index={index}
            count={workout.exercises.length}
          />
        ))}

        {workout.exercises.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-6 py-10 text-center text-muted-foreground">{t("Add your first exercise to start logging sets.")}{" "}</p>
        ) : null}

        <Button size="lg" variant={workout.exercises.length === 0 ? "default" : "secondary"} onClick={() => setPickerOpen(true)}>
          <PlusIcon aria-hidden />{" "}{t("Add exercise")}{" "}</Button>

        <Textarea
          key={`${workout.id}-notes`}
          defaultValue={workout.notes ?? ""}
          onBlur={(event) => edit(edits.setNotes(event.target.value))}
          placeholder={t("Workout notes")}
          aria-label={t("Workout notes")}
          className="mt-2"
        />
      </div>

      <ExercisePicker
        place={workout.place}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(exercises) =>
          edit(
            edits.addExercises(
              exercises.map((e) => ({
                exercise_id: e.id,
                exercise_name: e.name,
                tracking: e.tracking,
                primary_muscle: e.primary_muscle,
              })),
            ),
          )
        }
      />
      <DiscardDialog open={confirmDiscard} onOpenChange={setConfirmDiscard} workout={workout} />
      <RestTimer />
    </fieldset>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/60 px-2 py-1.5">
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className={`font-display text-2xl leading-tight font-bold tabular ${accent ? "text-primary-strong" : ""}`}>{value}</dd>
    </div>
  );
}

function WorkoutMenu({ onDiscard }: { onDiscard: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("Workout options")}>
          <EllipsisIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onSelect={onDiscard}>
          <Trash2Icon aria-hidden />{" "}{t("Discard workout")}{" "}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DiscardDialog({
  open,
  onOpenChange,
  workout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: DraftWorkout;
}) {
  const remove = useDiscardWorkout();
  const queryClient = useQueryClient();

  const onConfirm = () => {
    if (remove.isPending || useWorkoutStore.getState().active?.id !== workout.id) return;
    remove.mutate({
      workout,
      token: useSession.getState().token,
      deleteRemote: workout.syncedRevision > 0 || queryClient.isMutating({ mutationKey: SYNC_MUTATION_KEY }) > 0,
    }, {
      onError: () => toast.error(t("Couldn't discard the saved workout. Try again when you're online.")),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Discard this workout?")}</AlertDialogTitle>
          <AlertDialogDescription>{t("Exercises to delete: {count}. Their sets will also be deleted. This can't be undone.", { count: workout.exercises.length })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>{t("Discard")}{" "}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
