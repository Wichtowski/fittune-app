import type { Place } from "@/schemas/place";

/**
 * The place a new workout starts at: the one the user picked, otherwise the place of their
 * latest workout, otherwise their first place. Ids are matched rather than versions, so an
 * edited place resolves to its current equipment. Null means the user has no places yet
 */
export function startingPlace(places: readonly Place[], pickedId: string | null, lastWorkoutPlaceId: string | null | undefined): Place | null {
  return (
    places.find((place) => place.id === pickedId) ??
    places.find((place) => place.id === lastWorkoutPlaceId) ??
    places[0] ??
    null
  );
}
