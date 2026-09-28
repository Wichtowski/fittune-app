import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { OnlineOnly } from "./online-only";
import { useRouteApp } from "@/features/apps/use-active-app";
import { useConnectivity } from "@/lib/connectivity";
import { renderInRouter } from "@/test/router";

const page = () => (
  <OnlineOnly>
    <p>Diary</p>
  </OnlineOnly>
);

afterEach(() => {
  useConnectivity.setState({ deviceOnline: true, manualOffline: false, apiDown: false });
});

it("shows the page when online", async () => {
  renderInRouter(page);
  expect(await screen.findByText("Diary")).toBeInTheDocument();
});

it.each([
  ["the device is offline", { deviceOnline: false }, "FitHealth needs a connection"],
  ["offline mode is on", { manualOffline: true }, "FitHealth needs a connection"],
  ["the servers are down", { apiDown: true }, "FitHealth's servers are unavailable right now"],
])("explains itself when %s", async (_, state, title) => {
  useConnectivity.setState(state);
  renderInRouter(page);
  expect(await screen.findByText(title)).toBeInTheDocument();
  expect(screen.queryByText("Diary")).not.toBeInTheDocument();
});

it("links to the offline mode switch when it is on", async () => {
  useConnectivity.setState({ manualOffline: true });
  renderInRouter(page);
  expect(await screen.findByRole("link", { name: "Turn it off in Profile" })).toHaveAttribute("href", "/profile");
});

function BannerProbe() {
  // Mirrors the AppShell rule: the FitTune banner hides only on pages that belong to FitHealth
  return <p>{useRouteApp() === "health" ? "gate" : "banner"}</p>;
}

it("keeps the connection banner on shared pages after using FitHealth", async () => {
  renderInRouter(BannerProbe, { path: "/profile" });
  expect(await screen.findByText("banner")).toBeInTheDocument();
});

it("hides the connection banner on FitHealth pages", async () => {
  renderInRouter(BannerProbe, { path: "/health", app: "health" });
  expect(await screen.findByText("gate")).toBeInTheDocument();
});
