import { queryOptions } from "@tanstack/react-query";

import { account } from "./account";
import { queryKeys } from "./query-keys";

export const meQuery = () =>
  queryOptions({ queryKey: queryKeys.me, queryFn: ({ signal }) => account.getMe(signal), staleTime: 5 * 60_000 });
