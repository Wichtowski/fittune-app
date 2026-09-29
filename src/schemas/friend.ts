import { z } from "zod";

import { activityKindSchema, pageSchema, timestampSchema } from "./common";

/** The only profile fields the API shows about other users */
export const publicUserSchema = z.object({
  id: z.guid(),
  username: z.string(),
  display_name: z.string().nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** What a user lets friends see. Progress photos are never shared */
export const sharingSchema = z.object({
  workouts: z.boolean(),
  activities: z.boolean(),
  stats: z.boolean(),
  personal_records: z.boolean(),
});
export type Sharing = z.infer<typeof sharingSchema>;

export const friendSchema = z.object({
  user: publicUserSchema,
  since: timestampSchema,
  sharing: sharingSchema,
});
export type Friend = z.infer<typeof friendSchema>;

export const friendRequestSchema = z.object({ user: publicUserSchema, created_at: timestampSchema });
export type FriendRequest = z.infer<typeof friendRequestSchema>;

export const friendRequestsSchema = z.object({
  incoming: z.array(friendRequestSchema),
  outgoing: z.array(friendRequestSchema),
});

export const relationshipSchema = z.enum(["self", "none", "outgoing", "incoming", "friends"]);
export type Relationship = z.infer<typeof relationshipSchema>;

export const userWithRelationshipSchema = z.object({ user: publicUserSchema, relationship: relationshipSchema });
export type UserWithRelationship = z.infer<typeof userWithRelationshipSchema>;

export const blockedUserSchema = z.object({ user: publicUserSchema, created_at: timestampSchema });
export type BlockedUser = z.infer<typeof blockedUserSchema>;

const feedWorkoutSchema = z.object({
  type: z.literal("workout"),
  user: publicUserSchema,
  id: z.guid(),
  title: z.string(),
  started_at: timestampSchema,
  ended_at: timestampSchema.nullable(),
  duration_seconds: z.number().nullable(),
  exercise_count: z.number(),
  set_count: z.number(),
  total_reps: z.number(),
  volume_kg: z.number(),
  exercise_names: z.array(z.string()),
});

const feedActivitySchema = z.object({
  type: z.literal("activity"),
  user: publicUserSchema,
  id: z.guid(),
  kind: activityKindSchema,
  title: z.string(),
  started_at: timestampSchema,
  duration_seconds: z.number(),
  distance_m: z.number().nullable(),
  elevation_gain_m: z.number().nullable(),
});

export const feedEntrySchema = z.discriminatedUnion("type", [feedWorkoutSchema, feedActivitySchema]);
export type FeedEntry = z.infer<typeof feedEntrySchema>;
export const feedPageSchema = pageSchema(feedEntrySchema);

export const usernameSearchSchema = z.object({
  username: z.string().trim().min(1, "Enter a username"),
});
export type UsernameSearch = z.infer<typeof usernameSearchSchema>;

export function displayName(user: PublicUser) {
  return user.display_name ?? user.username;
}
