import { t } from "@/lib/i18n";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ActivityIcon, FlameIcon, PlayIcon, TrophyIcon } from "lucide-react";
import { useMemo } from "react";

import { activitiesInfiniteQuery } from "@/api/activities";
import { meQuery } from "@/api/auth";
import { musclesQuery, overviewQuery, recordsQuery, timelineQuery } from "@/api/stats";
import { workoutsInfiniteQuery } from "@/api/workouts";
import { EmptyState } from "@/components/empty-state";
import { QueryFallback } from "@/components/query-error";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCard } from "@/features/activity/components/activity-card";
import { BarList } from "@/features/analytics/components/bar-list";
import { ChartCard } from "@/features/analytics/components/chart-card";
import { ColumnChart } from "@/features/analytics/components/column-chart";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { compactTick, volumeSeries } from "@/features/analytics/series";
import { ActiveWorkoutBar } from "@/features/workouts/components/active-workout-bar";
import { WorkoutSummaryCard } from "@/features/workouts/components/workout-summary-card";
import { useWorkoutStore } from "@/features/workouts/store";
import { usePreferences } from "@/hooks/use-preferences";
import { currentWeek, rangePeriod, timeZone } from "@/lib/dates";
import { formatDay, formatDuration, greeting } from "@/lib/format";
import { muscleLabels } from "@/lib/labels";
import { formatDistance, formatVolume, formatWeight } from "@/lib/units";
import { BrowseExercisesLink } from "@/features/exercises/components/browse-exercises-link";

export function Dashboard() {
  const { data: me } = useQuery(meQuery());
  const preferences = usePreferences();
  const hasActive = useWorkoutStore((state) => state.active !== null);

  const week = useMemo(() => currentWeek(), []);
  const twelveWeeks = useMemo(() => rangePeriod("12w"), []);
  const month = useMemo(() => rangePeriod("4w"), []);

  const overview = useQuery({ ...overviewQuery(week, timeZone), placeholderData: keepPreviousData });
  const timeline = useQuery(timelineQuery(twelveWeeks, timeZone, "week"));
  const muscles = useQuery(musclesQuery(month, timeZone));
  const records = useQuery(recordsQuery());
  const workouts = useInfiniteQuery(workoutsInfiniteQuery("completed"));
  const activities = useInfiniteQuery(activitiesInfiniteQuery());

  const feed = useMemo(() => {
    const w = (workouts.data?.pages[0]?.items ?? []).map((item) => ({ type: "workout" as const, at: item.started_at, item }));
    const a = (activities.data?.pages[0]?.items ?? []).map((item) => ({ type: "activity" as const, at: item.started_at, item }));
    return [...w, ...a].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 6);
  }, [workouts.data, activities.data]);

  const current = overview.data?.current;
  const previous = overview.data?.previous;
  const volumeData = volumeSeries(timeline.data ?? [], "week", preferences.weightUnit);

  return (
    <>
      <PageHeader eyebrow={greeting()} title={me?.display_name ?? me?.username ?? t("Today")} />

      {/* Phone: the next action comes first. */}
      <div className="mb-6 grid gap-3 md:hidden">
        {hasActive ? (
          <ActiveWorkoutBar className="py-4" />
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Button asChild size="lg" className="h-16 text-lg">
              <Link to="/workout">
                <PlayIcon className="fill-current" aria-hidden />{" "}{t("Start workout")}{" "}</Link>
            </Button>
            <Button asChild size="lg" variant="endurance" className="h-16" aria-label={t("Log activity")}>
              <Link to="/activity" search={{ log: true }}>
                <ActivityIcon aria-hidden />
              </Link>
            </Button>
          </div>
        )}
        <BrowseExercisesLink />
      </div>

      <section aria-label={t("This week")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {current && previous ? (
          <>
            <StatTile
              label={t("Workouts this week")}
              value={String(current.workouts)}
              current={current.workouts}
              previous={previous.workouts}
              comparedTo="last week"
            />
            <StatTile
              label={t("Volume")}
              value={formatVolume(current.volume_kg, preferences.weightUnit)}
              current={current.volume_kg}
              previous={previous.volume_kg}
              comparedTo="last week"
            />
            <StatTile
              label={t("Active time")}
              value={formatDuration(current.workout_seconds + current.activity_seconds)}
              current={current.workout_seconds + current.activity_seconds}
              previous={previous.workout_seconds + previous.activity_seconds}
              comparedTo="last week"
            />
            <StatTile
              label={t("Distance")}
              value={formatDistance(current.activity_distance_m, preferences.distanceUnit, 1)}
              current={current.activity_distance_m}
              previous={previous.activity_distance_m}
              comparedTo="last week"
            />
          </>
        ) : (
          <QueryFallback query={overview} className="col-span-full">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
          </QueryFallback>
        )}
      </section>

      {overview.data && overview.data.streak_weeks > 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <FlameIcon className="size-4 text-endurance-strong" aria-hidden />
          <span>
            <span className="font-semibold text-foreground">{t("Training streak (weeks): {count}", { count: overview.data.streak_weeks })}</span></span>
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={t("Weekly volume")}
          description={`${t("Last 12 weeks")} · ${preferences.weightUnit}`}
          refreshing={timeline.isFetching && !timeline.isPending}
          table={{
            columns: [t("Week of"), `${t("Volume")} (${preferences.weightUnit})`],
            rows: volumeData.map((d) => [d.label, d.value.toLocaleString()]),
          }}
        >
          {timeline.isPending ? (
            <QueryFallback query={timeline}>
              <Skeleton className="h-[220px]" />
            </QueryFallback>
          ) : (
            <ColumnChart
              data={volumeData}
              series="strength"
              seriesLabel={t("Volume")}
              formatValue={(v) => `${v.toLocaleString()} ${preferences.weightUnit}`}
              formatTick={compactTick}
            />
          )}
        </ChartCard>

        <Card className="hidden flex-col gap-3 p-5 lg:flex">
          <h3 className="font-semibold">{t("Muscle focus")}</h3>
          <p className="-mt-2 text-sm text-muted-foreground">{t("Working sets, last 4 weeks")}</p>
          {muscles.data && muscles.data.length > 0 ? (
            <BarList
              items={muscles.data.slice(0, 8).map((m) => ({
                key: m.muscle,
                label: t(muscleLabels[m.muscle]),
                value: m.sets,
                display: t("Sets: {count}", { count: m.sets }),
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("Log a few workouts to see which muscles you train most.")}</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold tracking-wide uppercase">{t("Recent")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/workouts">{t("All workouts")}</Link>
            </Button>
          </div>
          {workouts.isPending || activities.isPending ? (
            <QueryFallback query={workouts.isPending ? workouts : activities}>
              <div className="grid gap-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
            </QueryFallback>
          ) : feed.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title={t("Nothing logged yet")}
              description={t("Start a workout or log a run - it will show up here.")}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {feed.map((entry) => (
                <li key={`${entry.type}-${entry.item.id}`}>
                  {entry.type === "workout" ? (
                    <WorkoutSummaryCard workout={entry.item} weightUnit={preferences.weightUnit} />
                  ) : (
                    <Link to="/activity" className="block">
                      <ActivityCard activity={entry.item} distanceUnit={preferences.distanceUnit} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hidden lg:block">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold tracking-wide uppercase">{t("Records")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/progress">{t("Progress")}</Link>
            </Button>
          </div>
          <Card className="divide-y">
            {(records.data ?? [])
              .filter((r) => r.best_e1rm_kg !== null || r.max_weight_kg !== null)
              .slice(0, 6)
              .map((record) => (
                <Link
                  key={record.exercise_id}
                  to="/exercises/$exerciseId"
                  params={{ exerciseId: record.exercise_id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50"
                >
                  <TrophyIcon className="size-4 text-primary-strong" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{record.exercise_name}</span>
                    <span className="block text-xs text-muted-foreground">{formatDay(record.last_performed_at)}</span>
                  </span>
                  <span className="text-right text-sm tabular">
                    <span className="block font-semibold">{formatWeight(record.max_weight_kg, preferences.weightUnit)}</span>
                    {record.best_e1rm_kg ? (
                      <span className="block text-xs text-muted-foreground">
                        e1RM {formatWeight(record.best_e1rm_kg, preferences.weightUnit)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))}
            {records.data && records.data.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t("Personal records appear after your first workout.")}</p>
            ) : null}
          </Card>
        </section>
      </div>
    </>
  );
}
