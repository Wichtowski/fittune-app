import { queryOptions } from "@tanstack/react-query";

import { account } from "./account";
import { queryKeys } from "./query-keys";

export const invitesQuery = () =>
  queryOptions({ queryKey: queryKeys.invites, queryFn: ({ signal }) => account.getInvites(signal) });
