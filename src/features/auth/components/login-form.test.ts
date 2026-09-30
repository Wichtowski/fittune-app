import { describe, expect, it } from "vitest";

import { safeRedirect } from "./login-form";

describe("safeRedirect", () => {
  it.each([
    undefined,
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "//[",
    "/login?redirect=/train",
    "/train/../login",
    "/train/..//evil.example",
  ])("rejects an unsafe or recursive redirect: %s", (redirect) => {
    expect(safeRedirect(redirect)).toBe("/");
  });

  it.each([
    ["/train/history?status=completed#latest", "/train/history?status=completed#latest"],
    ["/train/../nutrition", "/nutrition"],
    ["/", "/"],
  ])("preserves a local destination: %s", (redirect, expected) => {
    expect(safeRedirect(redirect)).toBe(expected);
  });
});
