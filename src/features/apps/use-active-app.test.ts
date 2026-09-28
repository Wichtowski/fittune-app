import { expect, it } from "vitest";

import { resolveActiveApp } from "./use-active-app";

it("prefers the app of the deepest route that declares one", () => {
  const matches = [{ staticData: {} }, { staticData: { app: "health" as const } }, { staticData: {} }];
  expect(resolveActiveApp(matches, "train")).toBe("health");
});

it("falls back to the last used app on shared pages", () => {
  expect(resolveActiveApp([{ staticData: {} }], "health")).toBe("health");
});

it("defaults to FitTune when nothing is known", () => {
  expect(resolveActiveApp([{ staticData: {} }], null)).toBe("train");
});
