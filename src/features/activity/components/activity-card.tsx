import { t } from "@/lib/i18n";
import { activityIcons, activityRate } from "../meta";
import { formatDay, formatDuration, formatTime } from "@/lib/format";
import { activityLabels } from "@/lib/labels";
import { formatDistance } from "@/lib/units";
import type { Activity } from "@/schemas/activity";
import type { DistanceUnit } from "@/schemas/common";

export function ActivityCard({
  activity,
  distanceUnit,
  onSelect,
}: {
  activity: Activity;
  distanceUnit: DistanceUnit;
  onSelect?: (activity: Activity) => void;
}) {
  const Icon = activityIcons[activity.kind];
  const rate = activityRate(activity.kind, activity.duration_seconds, activity.distance_m, distanceUnit);

  const body = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-endurance/15 text-endurance-strong">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{activity.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDay(activity.started_at)} · {formatTime(activity.started_at)}
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{t(activityLabels[activity.kind])}</span>
        <span className="mt-2 flex flex-wrap gap-x-4 text-sm font-semibold tabular">
          {activity.distance_m ? <span>{formatDistance(activity.distance_m, distanceUnit)}</span> : null}
          <span>{formatDuration(activity.duration_seconds)}</span>
          {rate ? <span>{rate}</span> : null}
          {activity.avg_heart_rate ? <span>{activity.avg_heart_rate} bpm</span> : null}
        </span>
      </span>
    </>
  );
  const className = "flex w-full gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-accent/60";

  return onSelect ? (
    <button type="button" onClick={() => onSelect(activity)} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
