import type { PlaceInput } from "@/schemas/place";

// Mirrors the API limit on active places per user
export const MAX_PLACES = 10;

export const placeKindLabels = { home: "Home", gym: "Gym", custom: "Custom" };

export const placePresets: Record<PlaceInput["kind"], PlaceInput> = {
  home: { name: "Home", kind: "home", equipment: ["dumbbell", "band"] },
  gym: { name: "Gym", kind: "gym", equipment: ["barbell", "dumbbell", "kettlebell", "machine", "cable", "plate"] },
  custom: { name: "", kind: "custom", equipment: [] },
};
