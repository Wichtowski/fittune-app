import { EQUIPMENT_ITEMS } from "@/schemas/common";
import type { PlaceInput } from "@/schemas/place";

// Mirrors the API limit on active places per user
export const MAX_PLACES = 10;

export const placeKindLabels = { home: "Home", gym: "Gym", custom: "Custom" };

export const placePresets: Record<PlaceInput["kind"], PlaceInput> = {
  home: { name: "Home", kind: "home", equipment: ["dumbbells", "adjustable_bench", "resistance_band"] },
  gym: { name: "Gym", kind: "gym", equipment: [...EQUIPMENT_ITEMS] },
  custom: { name: "", kind: "custom", equipment: [] },
};
