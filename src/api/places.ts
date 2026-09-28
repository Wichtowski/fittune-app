import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

export const placesQuery = () =>
  queryOptions({ queryKey: queryKeys.places, queryFn: ({ signal }) => fittune.getPlaces(signal) });
