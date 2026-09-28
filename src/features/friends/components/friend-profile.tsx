import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BanIcon, EllipsisIcon, UserMinusIcon, UserXIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { forgetFriend } from "../cache";
import { UserAvatar } from "./user-avatar";
import { FriendFeed } from "./friend-feed";
import { ApiError } from "@/api/client";
import { blockUser, friendOverviewQuery, friendQuery, friendRecordsQuery, removeFriend } from "@/api/friends";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { QueryFallback } from "@/components/query-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { usePreferences } from "@/hooks/use-preferences";
import { rangePeriod, timeZone } from "@/lib/dates";
import { formatDate, formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import { muscleLabels } from "@/lib/labels";
import { formatDistance, formatVolume, formatWeight } from "@/lib/units";
import { displayName, type Friend, type Sharing } from "@/schemas/friend";

const sharingLabels: Record<keyof Sharing, string> = {
  workouts: "Workouts",
  activities: "Activities",
  stats: "Stats",
  personal_records: "Personal records",
};

export function FriendProfile({ userId }: { userId: string }) {
  const query = useQuery({ ...friendQuery(userId), staleTime: 0 });
  const queryClient = useQueryClient();
  // A 404 wins over data cached before the friendship ended
  const gone = query.error instanceof ApiError && query.error.status === 404;

  useEffect(() => {
    if (gone) forgetFriend(queryClient, userId);
  }, [gone, queryClient, userId]);

  if (gone) {
    return (
      <>
        <PageHeader eyebrow={<BackLink />} title={t("Friend")} />
        <EmptyState
          icon={UserXIcon}
          title={t("Not available")}
          description={t("You are not friends with this person, or they are no longer on FitTune.")}
          action={<Button asChild variant="secondary"><Link to="/friends">{t("Back to friends")}</Link></Button>}
        />
      </>
    );
  }
  if (!query.data) {
    return (
      <QueryFallback query={query}>
        <div className="grid gap-3 pt-8">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-28" />
        </div>
      </QueryFallback>
    );
  }
  return <FriendView friend={query.data} />;
}

function BackLink() {
  return <Link to="/friends" className="hover:underline">{t("Friends")}</Link>;
}

function FriendView({ friend }: { friend: Friend }) {
  const { user, sharing } = friend;
  const shared = (Object.keys(sharingLabels) as (keyof Sharing)[]).filter((key) => sharing[key]);

  return (
    <>
      <PageHeader eyebrow={<BackLink />} title={displayName(user)} actions={<FriendActions friend={friend} />} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <UserAvatar user={user} className="size-14 text-2xl" />
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">
            @{user.username} · {t("Friends since {date}", { date: formatDate(friend.since) })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {shared.length ? (
              shared.map((key) => <Badge key={key} variant="secondary">{t(sharingLabels[key])}</Badge>)
            ) : (
              <span className="text-sm text-muted-foreground">{t("Doesn't share any progress yet")}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sharing.stats ? <FriendTotals userId={user.id} /> : null}
        {sharing.personal_records ? <FriendRecords userId={user.id} /> : null}
        {/* Last, since it pages on without end */}
        {sharing.workouts || sharing.activities ? (
          <Section title={t("Recent sessions")}>
            <FriendFeed userId={user.id} emptyDescription={t("No finished sessions yet.")} />
          </Section>
        ) : null}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-3">
      <h2 className="font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
      {children}
    </section>
  );
}

function FriendTotals({ userId }: { userId: string }) {
  const period = useMemo(() => rangePeriod("4w"), []);
  const query = useQuery(friendOverviewQuery(userId, period, timeZone));
  const { weightUnit, distanceUnit } = usePreferences();
  const current = query.data?.current;

  return (
    <Section title={t("Last 4 weeks")}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {current && query.data ? (
          <>
            <StatTile label={t("Workouts")} value={String(current.workouts)} />
            <StatTile label={t("Volume")} value={formatVolume(current.volume_kg, weightUnit)} />
            <StatTile label={t("Training time")} value={formatDuration(current.workout_seconds + current.activity_seconds)} />
            <StatTile label={t("Week streak")} value={String(query.data.streak_weeks)} />
          </>
        ) : (
          <QueryFallback query={query} className="col-span-full">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
          </QueryFallback>
        )}
      </div>
      {current && current.activity_distance_m > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("Distance")}: <span className="font-semibold text-foreground">{formatDistance(current.activity_distance_m, distanceUnit, 1)}</span>
        </p>
      ) : null}
    </Section>
  );
}

const RECORDS_SHOWN = 10;

function FriendRecords({ userId }: { userId: string }) {
  const query = useQuery(friendRecordsQuery(userId));
  const { weightUnit, distanceUnit } = usePreferences();

  return (
    <Section title={t("Personal records")}>
      {!query.data ? (
        <QueryFallback query={query}>
          <Skeleton className="h-40" />
        </QueryFallback>
      ) : !query.data.length ? (
        <p className="text-sm text-muted-foreground">{t("No records yet")}</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                <th>{t("Exercise")}</th>
                <th className="text-right">{t("Best")}</th>
                <th className="hidden text-right sm:table-cell">{t("Est. 1RM")}</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {query.data.slice(0, RECORDS_SHOWN).map((record) => (
                <tr key={record.exercise_id} className="border-t [&>td]:px-4 [&>td]:py-3">
                  <td>
                    <p className="font-medium">{record.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">{t(muscleLabels[record.primary_muscle])}</p>
                  </td>
                  <td className="text-right font-semibold">
                    {record.tracking === "weight_reps"
                      ? formatWeight(record.max_weight_kg, weightUnit)
                      : record.tracking === "reps"
                        ? t("Reps: {count}", { count: record.max_reps ?? "–" })
                        : record.tracking === "duration"
                          ? formatDuration(record.max_duration_seconds)
                          : formatDistance(record.max_distance_m, distanceUnit)}
                  </td>
                  <td className="hidden text-right sm:table-cell">
                    {record.best_e1rm_kg ? formatWeight(record.best_e1rm_kg, weightUnit) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Section>
  );
}

type Confirm = "remove" | "block" | null;

function FriendActions({ friend }: { friend: Friend }) {
  const { user } = friend;
  const name = displayName(user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const leave = async (message: string) => {
    setConfirm(null);
    toast.success(message);
    // Leave first, so nothing still shows the data being dropped
    await navigate({ to: "/friends", replace: true });
    forgetFriend(queryClient, user.id);
  };
  const remove = useMutation({
    mutationFn: () => removeFriend(user.id),
    onSuccess: () => leave(t("{name} removed from friends", { name })),
    onError: (error) => toast.error(t(error.message)),
  });
  const block = useMutation({
    mutationFn: () => blockUser(user.id),
    onSuccess: () => leave(t("{name} blocked", { name })),
    onError: (error) => toast.error(t(error.message)),
  });

  const dialog = confirm === "remove"
    ? {
        title: t("Remove {name} from friends?", { name }),
        description: t("You stop seeing each other's progress right away. You can send a new request later."),
        action: t("Remove"),
        run: () => remove.mutate(),
      }
    : {
        title: t("Block {name}?", { name }),
        description: t("This also removes the friendship. They can't find you or send you requests until you unblock them."),
        action: t("Block"),
        run: () => block.mutate(),
      };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label={t("Friend actions")}>
            <EllipsisIcon className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setConfirm("remove")}>
            <UserMinusIcon className="size-4" aria-hidden />{t("Remove friend")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("block")}>
            <BanIcon className="size-4" aria-hidden />{t("Block")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={remove.isPending || block.isPending} onClick={dialog.run}>
              {dialog.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
