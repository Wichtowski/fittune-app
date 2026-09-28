import { formatShortDate } from "@/lib/format";
import { getLocale, t } from "@/lib/i18n";
import { kgTo, metresTo } from "@/lib/units";
import type { DistanceUnit, WeightUnit } from "@/schemas/common";
import type { Bucket, TimelinePoint } from "@/schemas/stats";

import type { ColumnDatum } from "./components/column-chart";

const monthLabels = { en: new Intl.DateTimeFormat("en", { month: "short" }), pl: new Intl.DateTimeFormat("pl", { month: "short" }) };

export function bucketLabel(bucket: string, kind: Bucket): string {
  return kind === "month" ? monthLabels[getLocale()].format(new Date(`${bucket}T12:00:00`)) : formatShortDate(bucket);
}

export function volumeSeries(points: TimelinePoint[], bucket: Bucket, unit: WeightUnit): ColumnDatum[] {
  return points.map((p) => ({
    key: p.bucket,
    label: bucketLabel(p.bucket, bucket),
    value: Math.round(kgTo(unit, p.volume_kg)),
    tooltipTitle: bucket === "week" ? `${t("Week of")} ${formatShortDate(p.bucket)}` : bucketLabel(p.bucket, bucket),
  }));
}

export function distanceSeries(points: TimelinePoint[], bucket: Bucket, unit: DistanceUnit): ColumnDatum[] {
  return points.map((p) => ({
    key: p.bucket,
    label: bucketLabel(p.bucket, bucket),
    value: Math.round(metresTo(unit, p.activity_distance_m) * 10) / 10,
    tooltipTitle: bucket === "week" ? `${t("Week of")} ${formatShortDate(p.bucket)}` : bucketLabel(p.bucket, bucket),
  }));
}

export function workoutCountSeries(points: TimelinePoint[], bucket: Bucket): ColumnDatum[] {
  return points.map((p) => ({
    key: p.bucket,
    label: bucketLabel(p.bucket, bucket),
    value: p.workouts,
    tooltipTitle: bucket === "week" ? `${t("Week of")} ${formatShortDate(p.bucket)}` : bucketLabel(p.bucket, bucket),
  }));
}

/** Compact tick labels: 12500 -> "12.5k" */
export function compactTick(value: number): string {
  return Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value);
}
