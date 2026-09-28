import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useLastApp } from "./store";
import { useSession } from "@/features/auth/session";
import { storage } from "@/lib/storage";
import { routeTree } from "@/routeTree.gen";

function makeRouter(path: string) {
  return createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
}

beforeEach(() => {
  // The shell prefetches the profile, a request that never answers keeps tests offline
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  useSession.setState({ token: "token", userId: "user" });
  useLastApp.setState({ lastApp: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSession.setState({ token: null, userId: null });
});

it("sends a signed-out visitor to login even with a remembered app", async () => {
  useSession.setState({ token: null, userId: null });
  useLastApp.setState({ lastApp: "health" });
  const router = makeRouter("/");
  void router.load();
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
});

it.each([
  ["train", "/train"],
  ["health", "/health"],
] as const)("opens the remembered %s app", async (app, home) => {
  useLastApp.setState({ lastApp: app });
  const router = makeRouter("/");
  void router.load();
  await waitFor(() => expect(router.state.location.pathname).toBe(home));
});

it("shows the launcher on first run", async () => {
  render(<RouterProvider router={makeRouter("/")} />);
  expect(await screen.findByRole("link", { name: /FitHealth/ })).toHaveAttribute("href", "/health");
  expect(screen.getByRole("link", { name: /FitTune/ })).toHaveAttribute("href", "/train");
});

it("shows the launcher when storage holds an app this build does not know", async () => {
  storage.setItem("fittune.last-app", JSON.stringify({ state: { lastApp: "nutrition" }, version: 0 }));
  await useLastApp.persist.rehydrate();
  expect(useLastApp.getState().lastApp).toBeNull();
  render(<RouterProvider router={makeRouter("/")} />);
  expect(await screen.findByRole("link", { name: /FitHealth/ })).toBeInTheDocument();
  storage.removeItem("fittune.last-app");
});
