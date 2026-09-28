import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpenIcon, TrophyIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { musclesQuery, overviewQuery, recordsQuery, timelineQuery } from "@/api/stats";
import { EmptyState } from "@/components/empty-state";
import { QueryFallback } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarList } from "@/features/analytics/components/bar-list";
import { ChartCard } from "@/features/analytics/components/chart-card";
import { ColumnChart } from "@/features/analytics/components/column-chart";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { compactTick, distanceSeries, volumeSeries, workoutCountSeries } from "@/features/analytics/series";
import { usePreferences } from "@/hooks/use-preferences";
import { RANGES, type RangeKey, rangePeriod, timeZone } from "@/lib/dates";
import { formatDay, formatDuration } from "@/lib/format";
import { muscleLabels } from "@/lib/labels";
import { formatDistance, formatVolume, formatWeight } from "@/lib/units";

type Metric = "volume" | "workouts" | "distance";

export function ProgressDashboard({ range, onRangeChange }: { range: RangeKey; onRangeChange: (range: RangeKey) => void }) {
  const preferences = usePreferences();
  const [metric, setMetric] = useState<Metric>("volume");
  const period = useMemo(() => rangePeriod(range), [range]);
  const bucket = RANGES[range].bucket;
  const comparedTo = `previous ${RANGES[range].label}`;

  // Keep the previous range on screen while the new one loads (no layout jump).
  const overview = useQuery({ ...overviewQuery(period, timeZone), placeholderData: keepPreviousData });
  const timeline = useQuery({ ...timelineQuery(period, timeZone, bucket), placeholderData: keepPreviousData });
  const muscles = useQuery({ ...musclesQuery(period, timeZone), placeholderData: keepPreviousData });
  const records = useQuery(recordsQuery());

  const points = timeline.data ?? [];
  const chart = {
    volume: {
      title: "Training volume",
      data: volumeSeries(points, bucket, preferences.weightUnit),
      series: "strength" as const,
      format: (v: number) => `${v.toLocaleString()} ${preferences.weightUnit}`,
      unit: preferences.weightUnit,
    },
    workouts: {
      title: "Workouts",
      data: workoutCountSeries(points, bucket),
      series: "strength" as const,
      format: (v: number) => `${v} workout${v === 1 ? "" : "s"}`,
      unit: "workouts",
    },
    distance: {
      title: "Distance",
      data: distanceSeries(points, bucket, preferences.distanceUnit),
      series: "endurance" as const,
      format: (v: number) => `${v} ${preferences.distanceUnit}`,
      unit: preferences.distanceUnit,
    },
  }[metric];

  const current = overview.data?.current;
  const previous = overview.data?.previous;
  const stale = (q: { isFetching: boolean; isPlaceholderData: boolean }) => q.isFetching && q.isPlaceholderData;

  return (
    <div className="grid gap-6">
      {/* One filter row scopes everything below it. */}
      <ToggleGroup
        type="single"
        value={range}
        onValueChange={(value) => value && onRangeChange(value as RangeKey)}
        aria-label="Time range"
        className="w-full md:w-auto md:justify-self-start"
      >
        {(Object.keys(RANGES) as RangeKey[]).map((key) => (
          <ToggleGroupItem key={key} value={key}>
            {RANGES[key].label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {current && previous ? (
          <>
            <StatTile label="Workouts" value={String(current.workouts)} current={current.workouts} previous={previous.workouts} comparedTo={comparedTo} />
            <StatTile
              label="Volume"
              value={formatVolume(current.volume_kg, preferences.weightUnit)}
              current={current.volume_kg}
              previous={previous.volume_kg}
              comparedTo={comparedTo}
            />
            <StatTile
              label="Training time"
              value={formatDuration(current.workout_seconds + current.activity_seconds)}
              current={current.workout_seconds + current.activity_seconds}
              previous={previous.workout_seconds + previous.activity_seconds}
              comparedTo={comparedTo}
            />
            <StatTile
              label="Distance"
              value={formatDistance(current.activity_distance_m, preferences.distanceUnit, 1)}
              current={current.activity_distance_m}
              previous={previous.activity_distance_m}
              comparedTo={comparedTo}
            />
          </>
        ) : (
          <QueryFallback query={overview} className="col-span-full">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
          </QueryFallback>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={chart.title}
          description={`Per ${bucket} · ${RANGES[range].label}`}
          refreshing={stale(timeline)}
          table={{
            columns: [bucket === "week" ? "Week of" : "Month", `${chart.title} (${chart.unit})`],
            rows: chart.data.map((d) => [d.tooltipTitle?.replace("Week of ", "") ?? d.label, d.value.toLocaleString()]),
          }}
        >
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(value) => value && setMetric(value as Metric)}
            aria-label="Metric"
            className="mb-3"
          >
            <ToggleGroupItem value="volume">Volume</ToggleGroupItem>
            <ToggleGroupItem value="workouts">Workouts</ToggleGroupItem>
            <ToggleGroupItem value="distance">Distance</ToggleGroupItem>
          </ToggleGroup>
          {timeline.isPending ? (
            <QueryFallback query={timeline}>
              <Skeleton className="h-[260px]" />
            </QueryFallback>
          ) : (
            <ColumnChart
              data={chart.data}
              series={chart.series}
              seriesLabel={chart.title}
              formatValue={chart.format}
              formatTick={compactTick}
              height={260}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Muscle distribution"
          description="Working sets by primary muscle"
          refreshing={stale(muscles)}
          table={{
            columns: ["Muscle", "Sets", `Volume (${preferences.weightUnit})`],
            rows: (muscles.data ?? []).map((m) => [muscleLabels[m.muscle], m.sets, formatVolume(m.volume_kg, preferences.weightUnit)]),
          }}
        >
          {muscles.data && muscles.data.length > 0 ? (
            <BarList
              items={muscles.data.map((m) => ({
                key: m.muscle,
                label: muscleLabels[m.muscle],
                value: m.sets,
                display: String(m.sets),
                detail: formatVolume(m.volume_kg, preferences.weightUnit),
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No strength training in this period.</p>
          )}
        </ChartCard>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">Personal records</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/exercises">
              <BookOpenIcon className="size-4" aria-hidden /> Exercise library
            </Link>
          </Button>
        </div>
        {records.isPending ? (
          <QueryFallback query={records}>
            <Skeleton className="h-48" />
          </QueryFallback>
        ) : !records.data || records.data.length === 0 ? (
          <EmptyState icon={TrophyIcon} title="No records yet" description="Finish a workout and your bests show up here." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                  <th>Exercise</th>
                  <th className="text-right">Best</th>
                  <th className="hidden text-right sm:table-cell">Est. 1RM</th>
                  <th className="hidden text-right md:table-cell">Sessions</th>
                  <th className="hidden text-right md:table-cell">Last done</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {records.data.map((record) => (
                  <tr key={record.exercise_id} className="border-t hover:bg-accent/40 [&>td]:px-4 [&>td]:py-3">
                    <td>
                      <Link
                        to="/exercises/$exerciseId"
                        params={{ exerciseId: record.exercise_id }}
                        className="font-medium hover:text-primary-strong hover:underline"
                      >
                        {record.exercise_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{muscleLabels[record.primary_muscle]}</p>
                    </td>
                    <td className="text-right font-semibold">
                      {record.tracking === "weight_reps"
                        ? formatWeight(record.max_weight_kg, preferences.weightUnit)
                        : record.tracking === "reps"
                          ? `${record.max_reps ?? "–"} reps`
                          : record.tracking === "duration"
                            ? formatDuration(record.max_duration_seconds)
                            : formatDistance(record.max_distance_m, preferences.distanceUnit)}
                    </td>
                    <td className="hidden text-right sm:table-cell">
                      {record.best_e1rm_kg ? formatWeight(record.best_e1rm_kg, preferences.weightUnit) : "–"}
                    </td>
                    <td className="hidden text-right md:table-cell">{record.sessions}</td>
                    <td className="hidden text-right text-muted-foreground md:table-cell">{formatDay(record.last_performed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
