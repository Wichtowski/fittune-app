import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ActivityIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { ActivityCard } from "./activity-card";
import { activitiesInfiniteQuery } from "@/api/activities";
import { overviewQuery, timelineQuery } from "@/api/stats";
import { EmptyState } from "@/components/empty-state";
import { QueryError, QueryFallback } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/features/analytics/components/chart-card";
import { ColumnChart } from "@/features/analytics/components/column-chart";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { distanceSeries } from "@/features/analytics/series";
import { usePreferences } from "@/hooks/use-preferences";
import { rangePeriod, timeZone } from "@/lib/dates";
import { formatDuration } from "@/lib/format";
import { activityLabels } from "@/lib/labels";
import { formatDistance } from "@/lib/units";
import type { Activity } from "@/schemas/activity";
import { ACTIVITY_KINDS, type ActivityKind } from "@/schemas/common";

export function ActivityOverview({ onSelect }: { onSelect: (activity: Activity) => void }) {
  const { distanceUnit } = usePreferences();
  const [kind, setKind] = useState<ActivityKind | undefined>();
  const list = useInfiniteQuery(activitiesInfiniteQuery(kind));
  const activities = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);

  const period = useMemo(() => rangePeriod("12w"), []);
  const month = useMemo(() => rangePeriod("4w"), []);
  const timeline = useQuery(timelineQuery(period, timeZone, "week"));
  const overview = useQuery(overviewQuery(month, timeZone));
  const distance = distanceSeries(timeline.data ?? [], "week", distanceUnit);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="order-2 min-w-0 lg:order-1">
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Filter by type">
          <FilterChip active={kind === undefined} onClick={() => setKind(undefined)}>
            All
          </FilterChip>
          {ACTIVITY_KINDS.map((k) => (
            <FilterChip key={k} active={kind === k} onClick={() => setKind(kind === k ? undefined : k)}>
              {activityLabels[k]}
            </FilterChip>
          ))}
        </div>

        {list.isPending ? (
          <QueryFallback query={list}>
            <div className="grid gap-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </QueryFallback>
        ) : list.error && activities.length === 0 ? (
          <QueryError error={list.error} onRetry={() => void list.refetch()} />
        ) : activities.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No activities" description="Runs, rides, walks and swims you log appear here." />
        ) : (
          <ul className="grid gap-3">
            {activities.map((activity) => (
              <li key={activity.id}>
                <ActivityCard activity={activity} distanceUnit={distanceUnit} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        )}
        {list.hasNextPage ? (
          <Button variant="secondary" className="mt-4 w-full" onClick={() => void list.fetchNextPage()}>
            {list.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>

      <aside className="order-1 grid content-start gap-3 lg:order-2">
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Distance, 4 weeks"
            value={overview.data ? formatDistance(overview.data.current.activity_distance_m, distanceUnit, 1) : "–"}
            current={overview.data?.current.activity_distance_m}
            previous={overview.data?.previous.activity_distance_m}
            comparedTo="prior 4 weeks"
          />
          <StatTile
            label="Time, 4 weeks"
            value={overview.data ? formatDuration(overview.data.current.activity_seconds) : "–"}
            current={overview.data?.current.activity_seconds}
            previous={overview.data?.previous.activity_seconds}
            comparedTo="prior 4 weeks"
          />
        </div>
        <ChartCard
          className="hidden md:flex"
          title="Weekly distance"
          description={`Last 12 weeks · ${distanceUnit}`}
          refreshing={timeline.isFetching && !timeline.isPending}
          table={{
            columns: ["Week of", `Distance (${distanceUnit})`],
            rows: distance.map((d) => [d.tooltipTitle?.replace("Week of ", "") ?? d.label, d.value]),
          }}
        >
          <ColumnChart
            data={distance}
            series="endurance"
            seriesLabel="Distance"
            formatValue={(v) => `${v} ${distanceUnit}`}
            height={200}
          />
        </ChartCard>
      </aside>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors aria-pressed:border-endurance aria-pressed:bg-endurance aria-pressed:text-endurance-foreground"
    >
      {children}
    </button>
  );
}
