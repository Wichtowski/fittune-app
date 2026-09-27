import { z } from "zod";

import { timestampSchema } from "./common";

export const INVITE_STATUSES = ["active", "used", "expired", "revoked"] as const;

export const inviteSchema = z.object({
  id: z.guid(),
  note: z.string().nullable(),
  status: z.enum(INVITE_STATUSES),
  max_uses: z.number(),
  use_count: z.number(),
  expires_at: timestampSchema,
  revoked_at: timestampSchema.nullable(),
  created_by: z.string().nullable(),
  created_at: timestampSchema,
});
export type Invite = z.infer<typeof inviteSchema>;

/** The plaintext code only comes back once, when the invite is created */
export const createdInviteSchema = z.object({ invite: inviteSchema, code: z.string() });
export type CreatedInvite = z.infer<typeof createdInviteSchema>;

export const inviteInputSchema = z.object({
  note: z.string().trim().max(120, "Keep the note under 120 characters"),
  expires_in_days: z.number().int().min(1).max(90),
  max_uses: z.number().int().min(1).max(50),
});
export type InviteInput = z.infer<typeof inviteInputSchema>;
