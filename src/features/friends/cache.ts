import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";

/**
 * Drops what is cached about one user once access to them ends (unfriended, blocked, or the
 * API answered 404), and refreshes the lists and feed they appeared in. Queries still on screen
 * are kept, since removing them would only make them fetch again
 */
export function forgetFriend(queryClient: QueryClient, userId: string) {
  queryClient.removeQueries({ queryKey: queryKeys.friends.user(userId), type: "inactive" });
  refreshFriends(queryClient);
}

/** Lists and feed change together whenever a friendship or request does */
export function refreshFriends(queryClient: QueryClient) {
  for (const queryKey of [queryKeys.friends.list, queryKeys.friends.requests, queryKeys.friends.feed, queryKeys.friends.blocks]) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
