import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import {
  authResponseSchema,
  type LoginInput,
  type ProfileUpdate,
  type RegisterInput,
  userSchema,
} from "@/schemas/user";

export const login = (input: LoginInput) =>
  request("/auth/login", { method: "POST", body: input, schema: authResponseSchema, anonymous: true });

export const register = (input: RegisterInput) =>
  request("/auth/register", { method: "POST", body: input, schema: authResponseSchema, anonymous: true });

export const logout = () => request("/auth/logout", { method: "POST" });

export const getMe = (signal?: AbortSignal) => request("/me", { schema: userSchema, signal });

export const meQuery = () =>
  queryOptions({ queryKey: queryKeys.me, queryFn: ({ signal }) => getMe(signal), staleTime: 5 * 60_000 });

export const updateProfile = (update: ProfileUpdate) =>
  request("/me", { method: "PATCH", body: update, schema: userSchema });

export const changePassword = (body: { current_password: string; new_password: string }) =>
  request("/me/password", { method: "POST", body });

export const deleteAccount = (password: string) => request("/me", { method: "DELETE", body: { password } });

export const listUsers = () => request("/users", { schema: z.array(userSchema) });
