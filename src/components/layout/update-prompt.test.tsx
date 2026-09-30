import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { UpdatePrompt } from "./update-prompt";

const callbacks = vi.hoisted(() => ({ registered: undefined as ((url: string, registration?: ServiceWorkerRegistration) => void) | undefined }));
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (options: { onRegisteredSW: typeof callbacks.registered }) => {
    callbacks.registered = options.onRegisteredSW;
    return { needRefresh: [false], updateServiceWorker: vi.fn() };
  },
}));

afterEach(() => vi.useRealTimers());

it("stops update checks when the app tree unmounts", async () => {
  vi.useFakeTimers();
  const update = vi.fn().mockResolvedValue(undefined);
  const { unmount } = render(<UpdatePrompt />);
  await act(async () => callbacks.registered?.("/sw.js", { update } as unknown as ServiceWorkerRegistration));
  expect(update).toHaveBeenCalledOnce();
  unmount();
  window.dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
  expect(update).toHaveBeenCalledOnce();
});
