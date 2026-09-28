import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

export const routinesQuery = () =>
  queryOptions({ queryKey: queryKeys.routines.list, queryFn: ({ signal }) => fittune.getRoutines(signal) });

export const routineQuery = (id: string) =>
  queryOptions({ queryKey: queryKeys.routines.detail(id), queryFn: ({ signal }) => fittune.getRoutine(id, signal) });
