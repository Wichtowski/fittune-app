import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { DumbbellIcon, UsersIcon } from "lucide-react";

import { friendFeedQuery } from "@/api/friends";
import { EmptyState } from "@/components/empty-state";
import { QueryFallback } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { activityIcons, activityRate } from "@/features/activity/meta";
import { usePreferences } from "@/hooks/use-preferences";
import { formatDay, formatDuration, formatTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { activityLabels } from "@/lib/labels";
import { formatDistance, formatVolume } from "@/lib/units";
import type { DistanceUnit, WeightUnit } from "@/schemas/common";
import { displayName, type FeedEntry } from "@/schemas/friend";

/** Shared sessions of every friend, or only of `userId` on a friend's profile */
export function FriendFeed({ userId, emptyDescription }: { userId?: string; emptyDescription: string }) {
  const query = useInfiniteQuery(friendFeedQuery(userId));
  const { weightUnit, distanceUnit } = usePreferences();
  const entries = query.data?.pages.flatMap((page) => page.items);

  if (!entries) {
    return (
      <QueryFallback query={query}>
        <div className="grid grid-cols-1 gap-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </QueryFallback>
    );
  }
  if (!entries.length) return <EmptyState icon={UsersIcon} title={t("Nothing shared yet")} description={emptyDescription} />;

  return (
    <div className="grid grid-cols-1 gap-2">
      <ul className="grid grid-cols-1 gap-2">
        {entries.map((entry) => (
          <li key={`${entry.type}-${entry.id}`}>
            <FeedEntryCard entry={entry} showUser={!userId} weightUnit={weightUnit} distanceUnit={distanceUnit} />
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button variant="secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? t("Loading…") : t("Load more")}
        </Button>
      ) : null}
    </div>
  );
}

function FeedEntryCard({
  entry,
  showUser,
  weightUnit,
  distanceUnit,
}: {
  entry: FeedEntry;
  showUser: boolean;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
}) {
  const workout = entry.type === "workout";
  const Icon = workout ? DumbbellIcon : activityIcons[entry.kind];
  const rate = workout ? null : activityRate(entry.kind, entry.duration_seconds, entry.distance_m, distanceUnit);

  return (
    <article className="flex gap-3 rounded-2xl border bg-card p-4">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${workout ? "bg-primary/15 text-primary-strong" : "bg-endurance/15 text-endurance-strong"}`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {showUser ? (
          <Link
            to="/friends/$userId"
            params={{ userId: entry.user.id }}
            className="block truncate text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            {displayName(entry.user)}
          </Link>
        ) : null}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-semibold">{entry.title}</h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDay(entry.started_at)} · {formatTime(entry.started_at)}
          </span>
        </div>
        {workout ? (
          <>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.exercise_names.join(", ") || t("No exercises")}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 text-sm font-semibold tabular">
              <span>{formatDuration(entry.duration_seconds)}</span>
              <span>{t("Sets: {count}", { count: entry.set_count })}</span>
              <span>{formatVolume(entry.volume_kg, weightUnit)}</span>
            </p>
          </>
        ) : (
          <>
            <p className="mt-0.5 text-sm text-muted-foreground">{t(activityLabels[entry.kind])}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 text-sm font-semibold tabular">
              {entry.distance_m ? <span>{formatDistance(entry.distance_m, distanceUnit)}</span> : null}
              <span>{formatDuration(entry.duration_seconds)}</span>
              {rate ? <span>{rate}</span> : null}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
