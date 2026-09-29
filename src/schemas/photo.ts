import { z } from "zod";

export const progressPhotoSchema = z.object({
  id: z.guid(),
  workout_id: z.guid().nullable(),
  width: z.number(),
  height: z.number(),
  bytes: z.number(),
  taken_at: z.iso.datetime(),
  created_at: z.iso.datetime(),
});
export type ProgressPhoto = z.infer<typeof progressPhotoSchema>;
