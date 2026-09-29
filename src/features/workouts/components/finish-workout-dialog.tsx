import { t } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import { FlagIcon } from "lucide-react";

import { type DraftWorkout, totals } from "../draft";
import { useWorkoutStore } from "../store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDuration } from "@/lib/format";
import { formatVolume } from "@/lib/units";

export function FinishWorkoutDialog({ workout }: { workout: DraftWorkout }) {
  const finish = useWorkoutStore((state) => state.finish);
  const navigate = useNavigate();
  const { weightUnit } = usePreferences();
  const now = useNow(15_000);
  const summary = totals(workout);
  const unfinished = summary.totalSets - workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  const elapsed = (now - new Date(workout.started_at).getTime()) / 1000;

  const onFinish = () => {
    const finished = finish();
    if (finished) void navigate({ to: "/workouts/$workoutId", params: { workoutId: finished.id }, search: { completed: true }, replace: true });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="px-4">
          <FlagIcon className="size-4" aria-hidden />{" "}{t("Finish")}{" "}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Finish workout?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {formatDuration(elapsed)} · {t("Sets: {count}", { count: summary.completedSets })} · {formatVolume(summary.volumeKg, weightUnit)}
            {unfinished > 0 ? ` · ${t("Unfinished sets: {count}. They won't count towards your stats.", { count: unfinished })}` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Keep going")}</AlertDialogCancel>
          <AlertDialogAction onClick={onFinish}>{t("Finish & save")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
