import { z } from "zod";

import { ApiClient } from "./client";
import {
  blockedUserSchema,
  feedPageSchema,
  friendRequestsSchema,
  friendSchema,
  type Sharing,
  sharingSchema,
  userWithRelationshipSchema,
} from "@/schemas/friend";
import { createdInviteSchema, type InviteInput, inviteSchema } from "@/schemas/invite";
import { exerciseRecordSchema, overviewSchema, type Period } from "@/schemas/stats";
import {
  authResponseSchema,
  type LoginInput,
  type ProfileUpdate,
  type RegisterInput,
  userSchema,
} from "@/schemas/user";

/**
 * Account and social endpoints, shared by FitTune and FitHealth. Methods are arrow fields so
 * they can be passed straight to `mutationFn`
 */
class AccountClient extends ApiClient {
  constructor() {
    super("");
  }

  // Session and profile
  login = (input: LoginInput) =>
    this.request("/auth/login", { method: "POST", body: input, schema: authResponseSchema, anonymous: true });
  register = (input: RegisterInput) =>
    this.request("/auth/register", { method: "POST", body: input, schema: authResponseSchema, anonymous: true });
  logout = () => this.request("/auth/logout", { method: "POST" });
  getMe = (signal?: AbortSignal) => this.request("/me", { schema: userSchema, signal });
  updateProfile = (update: ProfileUpdate) => this.request("/me", { method: "PATCH", body: update, schema: userSchema });
  changePassword = (body: { current_password: string; new_password: string }) =>
    this.request("/me/password", { method: "POST", body });
  deleteAccount = (password: string) => this.request("/me", { method: "DELETE", body: { password } });
  listUsers = () => this.request("/users", { schema: z.array(userSchema) });

  // Invites (admin)
  getInvites = (signal?: AbortSignal) => this.request("/admin/invites", { schema: inviteSchema.array(), signal });
  createInvite = (input: InviteInput) =>
    this.request("/admin/invites", {
      method: "POST",
      body: { ...input, note: input.note || null },
      schema: createdInviteSchema,
    });
  revokeInvite = (id: string) => this.request(`/admin/invites/${id}`, { method: "DELETE" });

  // Friends, blocks and sharing
  getFriends = (signal?: AbortSignal) => this.request("/friends", { schema: z.array(friendSchema), signal });
  getFriendRequests = (signal?: AbortSignal) => this.request("/friends/requests", { schema: friendRequestsSchema, signal });
  getBlocks = (signal?: AbortSignal) => this.request("/blocks", { schema: z.array(blockedUserSchema), signal });
  getSharing = (signal?: AbortSignal) => this.request("/me/sharing", { schema: sharingSchema, signal });
  lookupUser = (username: string, signal?: AbortSignal) =>
    this.request("/users/lookup", { schema: userWithRelationshipSchema, query: { username }, signal });
  /** Every friend's shared sessions, or one friend's when `userId` is given */
  getFriendFeed = (userId: string | undefined, cursor: string | undefined, signal?: AbortSignal) =>
    this.request(userId ? `/friends/${userId}/feed` : "/friends/feed", {
      schema: feedPageSchema,
      query: { cursor, limit: 20 },
      signal,
    });
  getFriend = (userId: string, signal?: AbortSignal) => this.request(`/friends/${userId}`, { schema: friendSchema, signal });
  getFriendOverview = (userId: string, period: Period, tz: string, signal?: AbortSignal) =>
    this.request(`/friends/${userId}/stats/overview`, { schema: overviewSchema, query: { ...period, tz }, signal });
  getFriendRecords = (userId: string, signal?: AbortSignal) =>
    this.request(`/friends/${userId}/records`, { schema: z.array(exerciseRecordSchema), signal });
  sendFriendRequest = (username: string) =>
    this.request("/friends/requests", { method: "POST", body: { username }, schema: userWithRelationshipSchema });
  acceptFriendRequest = (userId: string) =>
    this.request(`/friends/requests/${userId}/accept`, { method: "POST", schema: friendSchema });
  /** Declines an incoming request or cancels an outgoing one */
  deleteFriendRequest = (userId: string) => this.request(`/friends/requests/${userId}`, { method: "DELETE" });
  removeFriend = (userId: string) => this.request(`/friends/${userId}`, { method: "DELETE" });
  blockUser = (userId: string) => this.request(`/blocks/${userId}`, { method: "PUT" });
  unblockUser = (userId: string) => this.request(`/blocks/${userId}`, { method: "DELETE" });
  updateSharing = (sharing: Sharing) => this.request("/me/sharing", { method: "PUT", body: sharing, schema: sharingSchema });
}

export const account = new AccountClient();
