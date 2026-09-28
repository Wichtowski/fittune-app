import { fireEvent, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { PageHeader } from "@/components/layout/page-header";
import { renderInRouter } from "@/test/router";

const Header = () => <PageHeader title="Today" />;

it("offers the other app from a top-level screen", async () => {
  renderInRouter(Header, { path: "/health", app: "health" });
  fireEvent.click(await screen.findByRole("button", { name: "Switch app" }));
  expect(await screen.findByRole("link", { name: /FitTune/ })).toHaveAttribute("href", "/train");
  expect(screen.getByRole("link", { name: /FitHealth/ })).toHaveAttribute("aria-current", "page");
});

it("stays out of detail screens", async () => {
  renderInRouter(Header, { path: "/workouts/abc", app: "train" });
  await screen.findByRole("heading", { name: "Today" });
  expect(screen.queryByRole("button", { name: "Switch app" })).not.toBeInTheDocument();
});
