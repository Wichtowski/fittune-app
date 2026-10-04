import { useQuery } from "@tanstack/react-query";
import { CheckIcon, FlameIcon } from "lucide-react";

import { overviewQuery, timelineQuery } from "@/api/stats";
import { QueryFallback } from "@/components/query-error";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { currentWeek, rangePeriod, timeZone } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import { getLocale, t } from "@/lib/i18n";

export function WeeklyStreak() {
  const now = new Date(useNow(60_000));
  const week = currentWeek(now);
  const history = rangePeriod("12w", now);
  const overview = useQuery(overviewQuery(week, timeZone));
  const timeline = useQuery(timelineQuery(history, timeZone, "week"));

  if (!overview.data) {
    return <QueryFallback query={overview}><Skeleton className="h-48" /></QueryFallback>;
  }

  const streak = overview.data.streak_weeks;
  const weekLabel = new Intl.NumberFormat(getLocale(), { style: "unit", unit: "week", unitDisplay: "long" }).formatToParts(streak).find((part) => part.type === "unit")?.value;
  const complete = overview.data.current.workouts + overview.data.current.activities > 0;
  const status = complete ? t("This week complete") : streak > 0 ? t("Keep it going this week") : t("Start your weekly streak");
  const description = complete
    ? t("Your streak is safe this week. Rest days count as part of the plan.")
    : streak > 0
      ? t("Log a workout or activity by Sunday to keep your streak.")
      : t("One completed workout or logged activity starts your streak.");

  return (
    <Card className="grid gap-4 p-5" aria-label={t("Weekly streak")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><FlameIcon className="size-4 text-endurance-strong" aria-hidden />{t("Weekly streak")}</h2>
          <p className="mt-1 flex items-baseline gap-2"><span className="font-display text-4xl font-bold tabular">{streak}</span><span className="text-sm text-muted-foreground">{weekLabel}</span></p>
        </div>
        <p className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${complete ? "bg-primary/15 text-primary-strong" : "bg-muted text-muted-foreground"}`}>
          {complete ? <CheckIcon className="size-3.5" aria-hidden /> : null}{status}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {timeline.data ? (
        <div>
          <ol aria-label={t("Training history: last 12 weeks")} className="grid grid-cols-12 gap-1.5">
            {timeline.data.map((point) => {
              const sessions = point.workouts + point.activities;
              const thisWeek = point.bucket === week.from;
              const label = `${t("Week of {date}", { date: formatShortDate(`${point.bucket}T12:00:00`) })}: ${t("Sessions: {count}", { count: sessions })}${thisWeek ? ` · ${t("This week")}` : ""}`;
              return (
                <li key={point.bucket} aria-label={label} aria-current={thisWeek ? "date" : undefined} title={label} className={`flex h-9 items-center justify-center rounded-md border text-xs font-semibold tabular ${sessions > 0 ? "border-primary/30 bg-primary/20 text-primary-strong" : "border-border bg-muted/40 text-muted-foreground"} ${thisWeek ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""}`}>
                  <span aria-hidden>{sessions || "·"}</span>
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{t("Last 12 weeks")}</span><span>{t("This week")}</span></div>
        </div>
      ) : <QueryFallback query={timeline}><Skeleton className="h-12" /></QueryFallback>}
      <p className="border-t pt-3 text-xs text-muted-foreground">{t("Monday to Sunday, in your time zone. A week without training breaks the streak only after Sunday.")}</p>
    </Card>
  );
}
