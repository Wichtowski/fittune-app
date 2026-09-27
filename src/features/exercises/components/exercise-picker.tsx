import { useQuery } from "@tanstack/react-query";
import { CheckIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { filterExercises } from "../filter";
import { ExercisePhoto } from "./exercise-media";
import { exercisesQuery } from "@/api/exercises";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { equipmentSummary } from "@/features/places/format";
import { equipmentLabels, muscleLabels } from "@/lib/labels";
import { MUSCLES, type Muscle } from "@/schemas/common";
import type { Place } from "@/schemas/place";
import type { Exercise } from "@/schemas/exercise";

type ExercisePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercises: Exercise[]) => void;
  title?: string;
  place?: Place | null;
};

/** Multi-select exercise search; works offline from the cached library. */
export function ExercisePicker({ open, onOpenChange, onPick, title = "Add exercises", place }: ExercisePickerProps) {
  const { data, error, isPending, refetch } = useQuery(exercisesQuery());
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | undefined>();
  const [selected, setSelected] = useState<string[]>([]);

  const results = useMemo(() => filterExercises(data ?? [], { q, muscle, availableEquipment: place && !showAll ? place.equipment : undefined }), [data, q, muscle, place, showAll]);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setSelected([]);
      setShowAll(false);
      setQ("");
      setMuscle(undefined);
    }
  };

  const confirm = () => {
    const byId = new Map((data ?? []).map((exercise) => [exercise.id, exercise]));
    onPick(selected.map((id) => byId.get(id)).filter((e): e is Exercise => e !== undefined));
    close(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={close} title={title} className="md:max-w-2xl">
      <div className="flex min-h-[60dvh] flex-col gap-3 md:min-h-0">
        {place ? (
          <div className="rounded-xl border bg-muted/50 p-3 text-sm">
            <p className="font-medium">Equipment at {place.name}</p>
            <p className="text-muted-foreground">{equipmentSummary(place)}</p>
            <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2"><input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} className="size-4 accent-primary" />Show all exercises, including other equipment</label>
          </div>
        ) : null}
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="pl-11"
            type="search"
          />
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by muscle">
          {MUSCLES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={muscle === m}
              onClick={() => setMuscle(muscle === m ? undefined : m)}
              className="h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {muscleLabels[m]}
            </button>
          ))}
        </div>

        <div className="-mx-2 flex-1 overflow-y-auto md:max-h-[50dvh]">
          {error && !data ? <QueryError error={error} onRetry={() => void refetch()} /> : null}
          {isPending ? (
            <div className="grid gap-2 px-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : (
            <ul className="grid gap-0.5">
              {results.map((exercise) => {
                const isSelected = selected.includes(exercise.id);
                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSelected((current) =>
                          isSelected ? current.filter((id) => id !== exercise.id) : [...current, exercise.id],
                        )
                      }
                      className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-accent aria-pressed:bg-primary/10"
                    >
                      <span className="relative size-10 shrink-0">
                        <ExercisePhoto
                          name={exercise.name}
                          muscle={exercise.primary_muscle}
                          isCustom={exercise.is_custom}
                          className="size-10 rounded-xl"
                        />
                        {isSelected ? (
                          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/85 text-primary-foreground">
                            <CheckIcon className="size-5" aria-hidden />
                          </span>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{exercise.name}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {muscleLabels[exercise.primary_muscle]} · {equipmentLabels[exercise.equipment]}
                          {exercise.is_custom ? " · Custom" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && data ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No exercises match. Create a custom one from the Exercises page.
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <Button size="lg" disabled={selected.length === 0} onClick={confirm} className="w-full">
          {selected.length === 0 ? "Select exercises" : `Add ${selected.length} exercise${selected.length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
