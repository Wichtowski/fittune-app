import { screen, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { beforeEach, expect, it } from "vitest";

import { useLastApp } from "./store";
import { useRememberApp } from "./use-remember-app";
import { isNavDestination } from "./apps";
import { BottomNav } from "@/components/layout/bottom-nav";
import { renderInRouter } from "@/test/router";

function Remember() {
  useRememberApp();
  return null;
}

beforeEach(() => {
  useLastApp.setState({ lastApp: null });
});

it("remembers the app of the page being used", async () => {
  renderInRouter(Remember, { path: "/health", app: "health" });
  await waitFor(() => expect(useLastApp.getState().lastApp).toBe("health"));
});

it("applies the app accent before paint", async () => {
  const accents: (string | undefined)[] = [];
  function ReadAccent() {
    useRememberApp();
    useLayoutEffect(() => {
      accents.push(document.documentElement.dataset.app);
    }, []);
    return null;
  }

  renderInRouter(ReadAccent, { path: "/health", app: "health" });
  await waitFor(() => expect(accents).toEqual(["health"]));
});

it("leaves the remembered app alone on shared pages", async () => {
  useLastApp.setState({ lastApp: "health" });
  const router = renderInRouter(Remember, { path: "/profile" });
  await waitFor(() => expect(router.state.status).toBe("idle"));
  expect(useLastApp.getState().lastApp).toBe("health");
});

it("shows FitHealth navigation on FitHealth pages", async () => {
  renderInRouter(BottomNav, { path: "/health", app: "health" });
  expect(await screen.findByRole("link", { name: "Today" })).toHaveAttribute("href", "/health");
  expect(screen.queryByRole("link", { name: "Workout" })).not.toBeInTheDocument();
});

it("keeps FitHealth navigation on a shared page reached from FitHealth", async () => {
  useLastApp.setState({ lastApp: "health" });
  renderInRouter(BottomNav, { path: "/profile" });
  expect(await screen.findByRole("link", { name: "Today" })).toBeInTheDocument();
});

it("shows FitTune navigation on FitTune pages", async () => {
  renderInRouter(BottomNav, { path: "/train", app: "train" });
  expect(await screen.findByRole("link", { name: "Workout" })).toBeInTheDocument();
});

it("knows which screens are top level", () => {
  expect(isNavDestination("train", "/progress")).toBe(true);
  expect(isNavDestination("train", "/workouts/123")).toBe(false);
  expect(isNavDestination("health", "/health")).toBe(true);
});
