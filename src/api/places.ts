import { queryOptions } from "@tanstack/react-query";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import { type PlaceInput, placeSchema } from "@/schemas/place";

export const getPlaces = (signal?: AbortSignal) => request("/places", { schema: placeSchema.array(), signal });

export const placesQuery = () => queryOptions({
  queryKey: queryKeys.places,
  queryFn: ({ signal }) => getPlaces(signal),
});

export const savePlace = (id: string, input: PlaceInput) =>
  request(`/places/${id}`, { method: "PUT", body: input, schema: placeSchema });

export const archivePlace = (id: string) => request(`/places/${id}`, { method: "DELETE" });
