import { t } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { DumbbellIcon } from "lucide-react";

import { formatDay, formatDuration, formatTime } from "@/lib/format";
import { formatVolume } from "@/lib/units";
import type { WeightUnit } from "@/schemas/common";
import type { WorkoutSummary } from "@/schemas/workout";

export function WorkoutSummaryCard({ workout, weightUnit }: { workout: WorkoutSummary; weightUnit: WeightUnit }) {
  return (
    <Link
      to="/workouts/$workoutId"
      params={{ workoutId: workout.id }}
      className="flex gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/60"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-strong">
        <DumbbellIcon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{workout.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDay(workout.started_at)} · {formatTime(workout.started_at)}
          </span>
        </span>
        {workout.place ? <span className="mt-1 block truncate text-xs text-muted-foreground">{workout.place.name}</span> : null}
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
          {workout.exercise_names.join(", ") || t("No exercises")}
        </span>
        <span className="mt-2 flex gap-4 text-sm tabular">
          <Metric label={t("Time")} value={workout.ended_at ? formatDuration(workout.duration_seconds) : t("In progress")} />
          <Metric label={t("Sets")} value={String(workout.set_count)} />
          <Metric label={t("Volume")} value={formatVolume(workout.volume_kg, weightUnit)} />
        </span>
      </span>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="sr-only">{label}: </span>
      <span className="font-semibold">{value}</span>
      <span aria-hidden className="ml-1 text-xs text-muted-foreground">
        {label.toLowerCase()}
      </span>
    </span>
  );
}
