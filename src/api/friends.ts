import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { account } from "./account";
import { queryKeys } from "./query-keys";
import type { Period } from "@/schemas/stats";

export const friendsQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.list, queryFn: ({ signal }) => account.getFriends(signal) });

export const friendRequestsQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.requests, queryFn: ({ signal }) => account.getFriendRequests(signal) });

export const blocksQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.blocks, queryFn: ({ signal }) => account.getBlocks(signal) });

export const sharingQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.sharing, queryFn: ({ signal }) => account.getSharing(signal) });

export const lookupUserQuery = (username: string) =>
  queryOptions({
    queryKey: queryKeys.friends.lookup(username),
    queryFn: ({ signal }) => account.lookupUser(username, signal),
    // A missing user is an answer, not a failure worth retrying
    retry: false,
    staleTime: 0,
  });

/** Every friend's shared sessions, or one friend's when `userId` is given */
export const friendFeedQuery = (userId?: string) =>
  infiniteQueryOptions({
    queryKey: userId ? queryKeys.friends.userFeed(userId) : queryKeys.friends.feed,
    queryFn: ({ pageParam, signal }) => account.getFriendFeed(userId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const friendQuery = (userId: string) =>
  queryOptions({ queryKey: queryKeys.friends.detail(userId), queryFn: ({ signal }) => account.getFriend(userId, signal) });

export const friendOverviewQuery = (userId: string, period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.friends.overview(userId, period, tz),
    queryFn: ({ signal }) => account.getFriendOverview(userId, period, tz, signal),
  });

export const friendRecordsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.friends.records(userId),
    queryFn: ({ signal }) => account.getFriendRecords(userId, signal),
  });
