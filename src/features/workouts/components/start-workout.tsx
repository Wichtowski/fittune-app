import { t } from "@/lib/i18n";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardListIcon, CloudDownloadIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createWorkout, workoutFromPrevious, workoutFromRoutine } from "../draft";
import { useWorkoutStore } from "../store";
import { placesQuery } from "@/api/places";
import { routinesQuery } from "@/api/routines";
import { workoutQuery, workoutsInfiniteQuery } from "@/api/workouts";
import { EmptyState } from "@/components/empty-state";
import { QueryFallback } from "@/components/query-error";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlacePicker } from "@/features/places/components/place-picker";
import { useSession } from "@/features/auth/session";
import { startingPlace } from "@/features/places/select";
import { formatDay } from "@/lib/format";
import { muscleLabels } from "@/lib/labels";
import type { Routine } from "@/schemas/routine";

export function StartWorkout() {
  const [pickedPlaceId, setPickedPlaceId] = useState<string | null>(null);
  const start = useWorkoutStore((state) => state.start);
  const queryClient = useQueryClient();
  const routines = useQuery(routinesQuery());
  const places = useQuery(placesQuery());
  const recent = useInfiniteQuery(workoutsInfiniteQuery("completed"));
  const remote = useInfiniteQuery(workoutsInfiniteQuery("in_progress"));
  const lastWorkout = recent.data?.pages[0]?.items[0];
  const unfinished = remote.data?.pages[0]?.items[0];
  // Every new workout needs a place, so the exercise picker can match the equipment there
  const place = startingPlace(places.data ?? [], pickedPlaceId, lastWorkout?.place?.id);

  const load = useMutation({
    networkMode: "always",
    mutationFn: async (id: string) => {
      const token = useSession.getState().token;
      return { workout: await queryClient.fetchQuery(workoutQuery(id)), token };
    },
    onError: () => toast.error(t("Couldn't load that workout. Check your connection.")),
  });

  const repeatLast = () => {
    if (!lastWorkout || load.isPending) return;
    load.mutate(lastWorkout.id, { onSuccess: ({ workout, token }) => {
      if (place && useSession.getState().token === token) start({ ...workoutFromPrevious(workout), place });
    } });
  };

  const continueRemote = () => {
    if (!unfinished || load.isPending) return;
    load.mutate(unfinished.id, { onSuccess: ({ workout, token }) => {
      if (useSession.getState().token === token) start({ ...workout, syncedRevision: workout.revision, failedRevision: null, syncError: null });
    } });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("Workout")} eyebrow={t("Ready when you are")} />

      <PlacePicker value={place} onChange={(picked) => setPickedPlaceId(picked.id)} />

      <div className="grid gap-3">
        {unfinished ? (
          <button
            type="button"
            disabled={load.isPending}
            onClick={continueRemote}
            className="flex items-center gap-3 rounded-2xl border border-endurance/40 bg-endurance/10 p-4 text-left"
          >
            <CloudDownloadIcon className="size-6 text-endurance-strong" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("Continue “")}{unfinished.title}”</span>
              <span className="block text-sm text-muted-foreground">{t("Started")}{" "}{formatDay(unfinished.started_at)}{" "}{t("on another device")}{" "}</span>
            </span>
          </button>
        ) : null}

        <Button size="lg" className="h-16 text-lg" disabled={!place || load.isPending} onClick={() => place && start(createWorkout({ place }))}>
          <PlayIcon className="fill-current" aria-hidden />{" "}{t("Start workout")}{" "}</Button>

        {lastWorkout ? (
          <Button size="lg" variant="secondary" disabled={!place || load.isPending} onClick={repeatLast}>
            <RotateCcwIcon aria-hidden />{" "}{t("Repeat “")}{lastWorkout.title}”
          </Button>
        ) : null}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">{t("Routines")}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/routines">{t("Manage")}</Link>
          </Button>
        </div>

        {routines.isPending || (routines.isError && !routines.data) ? (
          <QueryFallback query={routines}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </QueryFallback>
        ) : routines.data && routines.data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {routines.data.map((routine) => (
              <li key={routine.id}>
                <RoutineStartCard routine={routine} disabled={!place || load.isPending} onStart={() => place && start({ ...workoutFromRoutine(routine), place })} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={ClipboardListIcon}
            title={t("No routines yet")}
            description={t("Plan your go-to sessions once, then start them with a tap.")}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link to="/routines/new">{t("Create routine")}</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}

function RoutineStartCard({ routine, disabled, onStart }: { routine: Routine; disabled: boolean; onStart: () => void }) {
  const muscles = [...new Set(routine.exercises.map((e) => t(muscleLabels[e.primary_muscle])))].slice(0, 3);
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{routine.name}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {routine.exercises.map((e) => e.exercise_name).join(", ") || t("No exercises")}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">
          {muscles.join(" · ")}
          {routine.last_performed_at ? ` · ${t("Last: {when}", { when: formatDay(routine.last_performed_at) })}` : ""}
        </span>
        <Button size="sm" disabled={disabled} onClick={onStart}>
          <PlayIcon className="size-4 fill-current" aria-hidden />{" "}{t("Start")}{" "}</Button>
      </div>
    </div>
  );
}
