import { queryOptions } from "@tanstack/react-query";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import { createdInviteSchema, type InviteInput, inviteSchema } from "@/schemas/invite";

export const invitesQuery = () => queryOptions({
  queryKey: queryKeys.invites,
  queryFn: ({ signal }) => request("/admin/invites", { schema: inviteSchema.array(), signal }),
});

export const createInvite = (input: InviteInput) =>
  request("/admin/invites", { method: "POST", body: { ...input, note: input.note || null }, schema: createdInviteSchema });

export const revokeInvite = (id: string) => request(`/admin/invites/${id}`, { method: "DELETE" });
