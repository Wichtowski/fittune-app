import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import {
  type Bucket,
  exerciseRecordSchema,
  muscleVolumeSchema,
  overviewSchema,
  type Period,
  timelinePointSchema,
} from "@/schemas/stats";

export const overviewQuery = (period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.stats.overview(period, tz),
    queryFn: ({ signal }) => request("/stats/overview", { schema: overviewSchema, query: { ...period, tz }, signal }),
  });

export const timelineQuery = (period: Period, tz: string, bucket: Bucket) =>
  queryOptions({
    queryKey: queryKeys.stats.timeline(period, tz, bucket),
    queryFn: ({ signal }) =>
      request("/stats/timeline", { schema: z.array(timelinePointSchema), query: { ...period, tz, bucket }, signal }),
  });

export const musclesQuery = (period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.stats.muscles(period, tz),
    queryFn: ({ signal }) =>
      request("/stats/muscles", { schema: z.array(muscleVolumeSchema), query: { ...period, tz }, signal }),
  });

export const recordsQuery = () =>
  queryOptions({
    queryKey: queryKeys.stats.records,
    queryFn: ({ signal }) => request("/stats/records", { schema: z.array(exerciseRecordSchema), signal }),
  });
