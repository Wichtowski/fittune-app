import { equipmentItemLabels } from "@/lib/labels";
import type { EquipmentItem } from "@/schemas/common";
import type { Place } from "@/schemas/place";

/** Everything available at a place, bodyweight always is. `limit` shortens long gym lists */
export function equipmentSummary(place: Pick<Place, "equipment">, limit = Infinity) {
  const shown = place.equipment.slice(0, limit).map((item) => equipmentItemLabels[item]);
  const hidden = place.equipment.length - shown.length;
  return ["Bodyweight", ...shown].join(" · ") + (hidden > 0 ? ` +${hidden} more` : "");
}

/** What an exercise needs, or that it needs nothing */
export function requirementSummary(requires: readonly EquipmentItem[]) {
  return requires.length ? requires.map((item) => equipmentItemLabels[item]).join(" · ") : "No equipment";
}
