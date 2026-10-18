import { t } from "@/lib/i18n";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ActivityIcon, PlayIcon, UserPlusIcon } from "lucide-react";
import { useMemo } from "react";

import { activitiesInfiniteQuery } from "@/api/activities";
import { meQuery } from "@/api/auth";
import { workoutsInfiniteQuery } from "@/api/workouts";
import { EmptyState } from "@/components/empty-state";
import { QueryFallback } from "@/components/query-error";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCard } from "@/features/activity/components/activity-card";
import { FriendFeed } from "@/features/friends/components/friend-feed";
import { ActiveWorkoutBar } from "@/features/workouts/components/active-workout-bar";
import { WorkoutSummaryCard } from "@/features/workouts/components/workout-summary-card";
import { useWorkoutStore } from "@/features/workouts/store";
import { usePreferences } from "@/hooks/use-preferences";
import { greeting } from "@/lib/format";
import { BrowseExercisesLink } from "@/features/exercises/components/browse-exercises-link";

/** Home: the next action, what friends share, and the user's own latest sessions. Stats live on Progress */
export function Dashboard() {
  const { data: me } = useQuery(meQuery());
  const preferences = usePreferences();
  const hasActive = useWorkoutStore((state) => state.active !== null);

  const workouts = useInfiniteQuery(workoutsInfiniteQuery("completed"));
  const activities = useInfiniteQuery(activitiesInfiniteQuery());

  const feed = useMemo(() => {
    const w = (workouts.data?.pages[0]?.items ?? []).map((item) => ({ type: "workout" as const, at: item.started_at, item }));
    const a = (activities.data?.pages[0]?.items ?? []).map((item) => ({ type: "activity" as const, at: item.started_at, item }));
    return [...w, ...a].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 6);
  }, [workouts.data, activities.data]);

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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <section aria-labelledby="friends-feed" className="grid min-w-0 grid-cols-1 gap-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="friends-feed" className="font-display text-xl font-bold tracking-wide uppercase">{t("Friends")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/friends">{t("All friends")}</Link>
            </Button>
          </div>
          <FriendFeed
            emptyDescription={t("Workouts, activities and progress photos your friends choose to share show up here.")}
            emptyAction={
              <Button asChild variant="secondary">
                <Link to="/friends">
                  <UserPlusIcon className="size-4" aria-hidden />{t("Add a friend")}
                </Link>
              </Button>
            }
          />
        </section>

        <section aria-labelledby="own-recent" className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="own-recent" className="font-display text-xl font-bold tracking-wide uppercase">{t("Your recent")}</h2>
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
      </div>
    </>
  );
}
