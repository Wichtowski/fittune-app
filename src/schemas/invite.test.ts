import { describe, expect, it } from "vitest";

import { inviteInputSchema } from "./invite";
import { registerFormSchema } from "./user";

const signup = { username: "ala", email: "ala@example.com", password: "Squat#Depth1", confirm_password: "Squat#Depth1", display_name: "" };

describe("invite-only sign-up", () => {
  it("requires an invite code and trims it", () => {
    const missing = registerFormSchema.safeParse({ ...signup, invite_code: "   " });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues.map((issue) => issue.path.join("."))).toContain("invite_code");
    expect(registerFormSchema.parse({ ...signup, invite_code: " abcd-efgh " }).invite_code).toBe("abcd-efgh");
  });

  it("keeps new invites within the API limits", () => {
    expect(inviteInputSchema.safeParse({ note: "", expires_in_days: 7, max_uses: 1 }).success).toBe(true);
    expect(inviteInputSchema.safeParse({ note: "", expires_in_days: 91, max_uses: 1 }).success).toBe(false);
    expect(inviteInputSchema.safeParse({ note: "", expires_in_days: 7, max_uses: 0 }).success).toBe(false);
  });
});
