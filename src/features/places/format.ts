import { equipmentLabels } from "@/lib/labels";
import type { Place } from "@/schemas/place";

/** Everything available at a place; bodyweight always is */
export function equipmentSummary(place: Pick<Place, "equipment">) {
  return ["Bodyweight", ...place.equipment.map((item) => equipmentLabels[item])].join(" · ");
}
