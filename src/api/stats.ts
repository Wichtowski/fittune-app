import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";
import type { Bucket, Period } from "@/schemas/stats";

export const overviewQuery = (period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.stats.overview(period, tz),
    queryFn: ({ signal }) => fittune.getOverview(period, tz, signal),
  });

export const timelineQuery = (period: Period, tz: string, bucket: Bucket) =>
  queryOptions({
    queryKey: queryKeys.stats.timeline(period, tz, bucket),
    queryFn: ({ signal }) => fittune.getTimeline(period, tz, bucket, signal),
  });

export const musclesQuery = (period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.stats.muscles(period, tz),
    queryFn: ({ signal }) => fittune.getMuscles(period, tz, signal),
  });

export const recordsQuery = () =>
  queryOptions({ queryKey: queryKeys.stats.records, queryFn: ({ signal }) => fittune.getRecords(signal) });
