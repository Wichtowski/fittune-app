import { t } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { type ExerciseFilter, filterExercises } from "../filter";
import { ExercisePhoto, MediaCredits } from "./exercise-media";
import { exercisesQuery } from "@/api/exercises";
import { LoadMore } from "@/components/load-more";
import { QueryError, QueryFallback } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIncrementalList } from "@/hooks/use-incremental-list";
import { equipmentLabels, muscleLabels, trackingLabels } from "@/lib/labels";
import { EQUIPMENT, type Equipment, MUSCLES, type Muscle } from "@/schemas/common";
import { exerciseOrigin } from "@/schemas/exercise";

/** Long enough to skip the keystrokes of a word, short enough to feel immediate */
const SEARCH_DEBOUNCE_MS = 200;

type ExerciseLibraryProps = {
  filter: ExerciseFilter;
  onFilterChange: (filter: ExerciseFilter) => void;
};

export function ExerciseLibrary({ filter, onFilterChange }: ExerciseLibraryProps) {
  const { data, error, isPending, fetchStatus, refetch } = useQuery(exercisesQuery());
  // The search text lives here, not in `filter`: the owner keeps `filter` in the URL, which
  // updates a moment after the keystroke, and a controlled input that is handed its previous
  // value back loses the caret position. The owner only hears about the text once it settles
  const [query, setQuery] = useState(filter.q ?? "");
  const settledQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if (settledQuery !== (filter.q ?? "")) onFilterChange({ ...filter, q: settledQuery || undefined });
    // Only a settled query is news for the owner; the filter changing is the owner's own doing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledQuery]);
  const results = useMemo(() => filterExercises(data ?? [], { ...filter, q: settledQuery }), [data, filter, settledQuery]);
  const { shown, hasMore, showMore } = useIncrementalList(results);
  const shownMedia = useMemo(() => shown.flatMap((exercise) => exercise.media), [shown]);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search exercises")}
            aria-label={t("Search exercises")}
            className="pl-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:contents">
          <Select
            value={filter.muscle ?? "all"}
            onValueChange={(value) => onFilterChange({ ...filter, muscle: value === "all" ? undefined : (value as Muscle) })}
          >
            <SelectTrigger aria-label={t("Muscle")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All muscles")}</SelectItem>
              {MUSCLES.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(muscleLabels[m])}
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
            <SelectTrigger aria-label={t("Equipment")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All equipment")}</SelectItem>
              {EQUIPMENT.map((e) => (
                <SelectItem key={e} value={e}>
                  {t(equipmentLabels[e])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => void refetch()} /> : null}
      {isPending ? (
        <QueryFallback query={{ error, fetchStatus, refetch }}>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </QueryFallback>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("Exercises: {count}", { count: results.length })}
          </p>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  to="/exercises/$exerciseId"
                  params={{ exerciseId: exercise.id }}
                  className="flex h-full items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-accent/60"
                >
                  <ExercisePhoto
                    name={exercise.name}
                    muscle={exercise.primary_muscle}
                    media={exercise.media}
                    className="size-12 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{exercise.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {t(muscleLabels[exercise.primary_muscle])} · {t(equipmentLabels[exercise.equipment])} ·{" "}
                      {t(trackingLabels[exercise.tracking])}
                    </span>
                  </span>
                  <OriginBadge exercise={exercise} />
                </Link>
              </li>
            ))}
          </ul>
          {hasMore ? <LoadMore key={shown.length} onLoadMore={showMore} /> : null}
          <MediaCredits media={shownMedia} />
        </>
      )}
    </div>
  );
}

/** Marks an exercise a user created: "Custom" for your own, the creator's name for others' */
function OriginBadge({ exercise }: { exercise: Parameters<typeof exerciseOrigin>[0] }) {
  const origin = exerciseOrigin(exercise);
  if (!origin) return null;
  if (origin.own || !origin.by) return <Badge variant="secondary">{t("Custom")}</Badge>;
  return (
    <Badge variant="outline" className="max-w-28 truncate" title={t("Created by {name}", { name: origin.by })}>
      {origin.by}
    </Badge>
  );
}
