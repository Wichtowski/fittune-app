import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { fithealth } from "./fithealth";
import { queryKeys } from "./query-keys";
import { timeZone } from "@/lib/dates";

export const dayQuery = (date: string) =>
  queryOptions({ queryKey: queryKeys.health.day(date), queryFn: ({ signal }) => fithealth.getDay(date, timeZone, signal) });

export const mealsQuery = () =>
  queryOptions({ queryKey: queryKeys.health.meals, queryFn: ({ signal }) => fithealth.getMeals(signal) });

export const productSearchQuery = (q: string) =>
  queryOptions({
    queryKey: queryKeys.health.products(q),
    queryFn: ({ signal }) => fithealth.searchProducts(q, signal),
    // Keep the last results on screen while the next search loads
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const profileQuery = () =>
  queryOptions({ queryKey: queryKeys.health.profile, queryFn: ({ signal }) => fithealth.getProfile(signal) });

export const weightsQuery = () =>
  queryOptions({ queryKey: queryKeys.health.weights, queryFn: ({ signal }) => fithealth.getWeights(signal) });
