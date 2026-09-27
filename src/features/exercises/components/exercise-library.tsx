import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useMemo } from "react";

import { type ExerciseFilter, filterExercises } from "../filter";
import { ExercisePhoto } from "./exercise-media";
import { exercisesQuery } from "@/api/exercises";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { equipmentLabels, muscleLabels, trackingLabels } from "@/lib/labels";
import { EQUIPMENT, type Equipment, MUSCLES, type Muscle } from "@/schemas/common";

type ExerciseLibraryProps = {
  filter: ExerciseFilter;
  onFilterChange: (filter: ExerciseFilter) => void;
};

export function ExerciseLibrary({ filter, onFilterChange }: ExerciseLibraryProps) {
  const { data, error, isPending, refetch } = useQuery(exercisesQuery());
  const results = useMemo(() => filterExercises(data ?? [], filter), [data, filter]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={filter.q ?? ""}
            onChange={(event) => onFilterChange({ ...filter, q: event.target.value || undefined })}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="pl-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:contents">
          <Select
            value={filter.muscle ?? "all"}
            onValueChange={(value) => onFilterChange({ ...filter, muscle: value === "all" ? undefined : (value as Muscle) })}
          >
            <SelectTrigger aria-label="Muscle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All muscles</SelectItem>
              {MUSCLES.map((m) => (
                <SelectItem key={m} value={m}>
                  {muscleLabels[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filter.equipment ?? "all"}
            onValueChange={(value) =>
              onFilterChange({ ...filter, equipment: value === "all" ? undefined : (value as Equipment) })
            }
          >
            <SelectTrigger aria-label="Equipment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All equipment</SelectItem>
              {EQUIPMENT.map((e) => (
                <SelectItem key={e} value={e}>
                  {equipmentLabels[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => void refetch()} /> : null}
      {isPending ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length} exercise{results.length === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {results.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  to="/exercises/$exerciseId"
                  params={{ exerciseId: exercise.id }}
                  className="flex h-full items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-accent/60"
                >
                  <ExercisePhoto
                    name={exercise.name}
                    muscle={exercise.primary_muscle}
                    isCustom={exercise.is_custom}
                    className="size-12 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{exercise.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {muscleLabels[exercise.primary_muscle]} · {equipmentLabels[exercise.equipment]} ·{" "}
                      {trackingLabels[exercise.tracking]}
                    </span>
                  </span>
                  {exercise.is_custom ? <Badge variant="secondary">Custom</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
