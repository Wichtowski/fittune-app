import { infiniteQueryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";
import type { ActivityKind } from "@/schemas/common";

export const activitiesInfiniteQuery = (kind?: ActivityKind) =>
  infiniteQueryOptions({
    queryKey: queryKeys.activities.list(kind),
    queryFn: ({ pageParam, signal }) => fittune.getActivitiesPage(kind, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
