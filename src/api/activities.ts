import { infiniteQueryOptions } from "@tanstack/react-query";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import { type ActivityInput, activitySchema } from "@/schemas/activity";
import { type ActivityKind, pageSchema } from "@/schemas/common";

const activityPageSchema = pageSchema(activitySchema);

export const activitiesInfiniteQuery = (kind?: ActivityKind) =>
  infiniteQueryOptions({
    queryKey: queryKeys.activities.list(kind),
    queryFn: ({ pageParam, signal }) =>
      request("/activities", { schema: activityPageSchema, query: { kind, cursor: pageParam, limit: 20 }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const putActivity = (id: string, input: ActivityInput) =>
  request(`/activities/${id}`, { method: "PUT", body: input, schema: activitySchema });

export const deleteActivity = (id: string) => request(`/activities/${id}`, { method: "DELETE" });
