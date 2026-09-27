import { z } from "zod";

import { equipmentSchema } from "./common";

export const PLACE_KINDS = ["home", "gym", "custom"] as const;
export const placeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  kind: z.enum(PLACE_KINDS),
  equipment: z.array(equipmentSchema.exclude(["none"])).max(8),
});
export type PlaceInput = z.infer<typeof placeInputSchema>;
export const placeSchema = placeInputSchema.extend({ id: z.guid(), version_id: z.guid() });
export type Place = z.infer<typeof placeSchema>;
