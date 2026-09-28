import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import {
  blockedUserSchema,
  feedPageSchema,
  friendRequestsSchema,
  friendSchema,
  type Sharing,
  sharingSchema,
  userWithRelationshipSchema,
} from "@/schemas/friend";
import { exerciseRecordSchema, overviewSchema, type Period } from "@/schemas/stats";

export const friendsQuery = () =>
  queryOptions({
    queryKey: queryKeys.friends.list,
    queryFn: ({ signal }) => request("/friends", { schema: z.array(friendSchema), signal }),
  });

export const friendRequestsQuery = () =>
  queryOptions({
    queryKey: queryKeys.friends.requests,
    queryFn: ({ signal }) => request("/friends/requests", { schema: friendRequestsSchema, signal }),
  });

export const blocksQuery = () =>
  queryOptions({
    queryKey: queryKeys.friends.blocks,
    queryFn: ({ signal }) => request("/blocks", { schema: z.array(blockedUserSchema), signal }),
  });

export const sharingQuery = () =>
  queryOptions({
    queryKey: queryKeys.friends.sharing,
    queryFn: ({ signal }) => request("/me/sharing", { schema: sharingSchema, signal }),
  });

export const lookupUserQuery = (username: string) =>
  queryOptions({
    queryKey: queryKeys.friends.lookup(username),
    queryFn: ({ signal }) => request("/users/lookup", { schema: userWithRelationshipSchema, query: { username }, signal }),
    // A missing user is an answer, not a failure worth retrying
    retry: false,
    staleTime: 0,
  });

/** Every friend's shared sessions, or one friend's when `userId` is given */
export const friendFeedQuery = (userId?: string) =>
  infiniteQueryOptions({
    queryKey: userId ? queryKeys.friends.userFeed(userId) : queryKeys.friends.feed,
    queryFn: ({ pageParam, signal }) =>
      request(userId ? `/friends/${userId}/feed` : "/friends/feed", {
        schema: feedPageSchema,
        query: { cursor: pageParam, limit: 20 },
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const friendQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.friends.detail(userId),
    queryFn: ({ signal }) => request(`/friends/${userId}`, { schema: friendSchema, signal }),
  });

export const friendOverviewQuery = (userId: string, period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.friends.overview(userId, period, tz),
    queryFn: ({ signal }) =>
      request(`/friends/${userId}/stats/overview`, { schema: overviewSchema, query: { ...period, tz }, signal }),
  });

export const friendRecordsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.friends.records(userId),
    queryFn: ({ signal }) => request(`/friends/${userId}/records`, { schema: z.array(exerciseRecordSchema), signal }),
  });

export const sendFriendRequest = (username: string) =>
  request("/friends/requests", { method: "POST", body: { username }, schema: userWithRelationshipSchema });

export const acceptFriendRequest = (userId: string) =>
  request(`/friends/requests/${userId}/accept`, { method: "POST", schema: friendSchema });

/** Declines an incoming request or cancels an outgoing one */
export const deleteFriendRequest = (userId: string) => request(`/friends/requests/${userId}`, { method: "DELETE" });

export const removeFriend = (userId: string) => request(`/friends/${userId}`, { method: "DELETE" });

export const blockUser = (userId: string) => request(`/blocks/${userId}`, { method: "PUT" });

export const unblockUser = (userId: string) => request(`/blocks/${userId}`, { method: "DELETE" });

export const updateSharing = (sharing: Sharing) =>
  request("/me/sharing", { method: "PUT", body: sharing, schema: sharingSchema });
