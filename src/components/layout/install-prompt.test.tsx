import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { InstallPrompt } from "./install-prompt";
import { storage } from "@/lib/storage";
import { renderInRouter } from "@/test/router";

afterEach(() => {
  vi.restoreAllMocks();
  storage.removeItem("fittune_install_prompt_dismissed_at");
});

it("shows installation failures instead of leaving an unhandled rejection", async () => {
  const failed = vi.spyOn(toast, "error");
  renderInRouter(InstallPrompt, { path: "/train" });
  await waitFor(() => expect(screen.queryByRole("button", { name: "Install" })).toBeNull());
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt: vi.fn().mockRejectedValue(new Error("install unavailable")),
    userChoice: Promise.resolve({ outcome: "dismissed" }),
  });
  fireEvent(window, event);
  fireEvent.click(await screen.findByRole("button", { name: "Install" }));
  await waitFor(() => expect(failed).toHaveBeenCalledWith("Could not install. Try again."));
  expect(screen.queryByRole("button", { name: "Install" })).toBeNull();
});
