import { afterEach, expect, it, vi } from "vitest";

import { useSession } from "./session";
import { signOut } from "./sign-out";
import { account } from "@/api/account";

afterEach(() => {
  vi.restoreAllMocks();
  useSession.getState().clear();
});

it("does not clear a replacement session when a delayed logout finishes", async () => {
  let finish!: () => void;
  vi.spyOn(account, "logout").mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  useSession.setState({ token: "old-token", userId: "old-user" });
  const pending = signOut();
  useSession.setState({ token: "new-token", userId: "new-user" });
  finish();
  await pending;
  expect(useSession.getState().token).toBe("new-token");
});
