import { z } from "zod";

import { accountTypeSchema, dateSchema, distanceUnitSchema, roleSchema, timestampSchema, weightUnitSchema } from "./common";

export const userSchema = z.object({
  id: z.guid(),
  username: z.string(),
  email: z.string(),
  display_name: z.string().nullable(),
  birthday: dateSchema.nullable(),
  role: roleSchema,
  account_type: accountTypeSchema.nullable(),
  weight_unit: weightUnitSchema,
  distance_unit: distanceUnitSchema,
  created_at: timestampSchema,
});
export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  session: z.object({ token: z.string(), expires_at: timestampSchema }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

// Password rules match the API: 8+ chars, an uppercase letter, a special character, no username.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must be at most 128 characters long")
  .regex(/\p{Lu}/u, "Password must contain at least one uppercase letter")
  .regex(/[^\p{L}\p{N}\s]/u, "Password must contain at least one special character");

export const loginInputSchema = z.object({
  login: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerFormSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters long")
      .max(32, "Username must be at most 32 characters long")
      .regex(/^[A-Za-z0-9._-]+$/, "Use letters, digits, '.', '_' and '-' only"),
    email: z.email("Invalid email address"),
    password: passwordSchema,
    confirm_password: z.string(),
    display_name: z.string().trim().max(64),
    invite_code: z.string().trim().min(1, "Enter the invite code you were given"),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  })
  .refine((v) => !v.username || !v.password.toLowerCase().includes(v.username.toLowerCase()), {
    path: ["password"],
    message: "Password cannot contain the username",
  });
export type RegisterForm = z.infer<typeof registerFormSchema>;

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  display_name?: string | null;
  birthday?: string | null;
  invite_code: string;
};

export const profileFormSchema = z.object({
  display_name: z.string().trim().max(64, "Display name must be at most 64 characters long"),
  birthday: z.union([dateSchema, z.literal("")]),
  account_type: z.union([accountTypeSchema, z.literal("none")]),
  weight_unit: weightUnitSchema,
  distance_unit: distanceUnitSchema,
});
export type ProfileForm = z.infer<typeof profileFormSchema>;

export type ProfileUpdate = Partial<{
  display_name: string | null;
  birthday: string | null;
  account_type: z.infer<typeof accountTypeSchema> | null;
  weight_unit: z.infer<typeof weightUnitSchema>;
  distance_unit: z.infer<typeof distanceUnitSchema>;
}>;

export const changePasswordFormSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });
export type ChangePasswordForm = z.infer<typeof changePasswordFormSchema>;
