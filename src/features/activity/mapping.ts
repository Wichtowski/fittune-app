import { toDateTimeLocal } from "@/lib/dates";
import { metresTo, toMetres, trimNumber } from "@/lib/units";
import type { Activity, ActivityFormInput, ActivityFormOutput, ActivityInput } from "@/schemas/activity";
import type { ActivityKind, DistanceUnit } from "@/schemas/common";
import { activityLabels } from "@/lib/labels";

export function defaultTitle(kind: ActivityKind, date = new Date()): string {
  const hour = date.getHours();
  const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return `${part} ${activityLabels[kind].toLowerCase()}`;
}

export function toFormValues(activity: Activity | undefined, unit: DistanceUnit): ActivityFormInput {
  if (!activity) {
    const now = new Date();
    return {
      kind: "run",
      title: defaultTitle("run", now),
      started_at: toDateTimeLocal(now),
      hours: 0,
      minutes: 30,
      seconds: 0,
      distance: "",
      elevation_gain_m: "",
      avg_heart_rate: "",
      perceived_effort: "",
      notes: "",
    };
  }
  const d = activity.duration_seconds;
  return {
    kind: activity.kind,
    title: activity.title,
    started_at: toDateTimeLocal(new Date(activity.started_at)),
    hours: Math.floor(d / 3600),
    minutes: Math.floor((d % 3600) / 60),
    seconds: d % 60,
    distance: activity.distance_m == null ? "" : trimNumber(metresTo(unit, activity.distance_m), 2),
    elevation_gain_m: activity.elevation_gain_m ?? "",
    avg_heart_rate: activity.avg_heart_rate ?? "",
    perceived_effort: activity.perceived_effort ?? "",
    notes: activity.notes ?? "",
  };
}

const orNull = (value: number | "") => (value === "" ? null : value);

export function toActivityInput(values: ActivityFormOutput, unit: DistanceUnit): ActivityInput {
  const distance = orNull(values.distance);
  return {
    kind: values.kind,
    title: values.title,
    notes: values.notes || null,
    started_at: new Date(values.started_at).toISOString(),
    duration_seconds: values.hours * 3600 + values.minutes * 60 + values.seconds,
    distance_m: distance == null ? null : Math.round(toMetres(unit, distance)),
    elevation_gain_m: orNull(values.elevation_gain_m),
    avg_heart_rate: orNull(values.avg_heart_rate),
    calories: null,
    perceived_effort: orNull(values.perceived_effort),
  };
}
