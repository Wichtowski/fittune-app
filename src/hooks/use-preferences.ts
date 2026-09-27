import { useQuery } from "@tanstack/react-query";

import { meQuery } from "@/api/auth";
import type { DistanceUnit, WeightUnit } from "@/schemas/common";

export type Preferences = { weightUnit: WeightUnit; distanceUnit: DistanceUnit };

/** Display units from the profile, with metric defaults until it has loaded. */
export function usePreferences(): Preferences {
  const { data } = useQuery(meQuery());
  return { weightUnit: data?.weight_unit ?? "kg", distanceUnit: data?.distance_unit ?? "km" };
}
