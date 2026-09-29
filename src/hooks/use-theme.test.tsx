import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { setThemePreference, useTheme } from "./use-theme";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem("fittune.theme");
});

it("follows operating system theme changes while preserving an explicit preference", () => {
  const media = new EventTarget();
  let light = false;
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    get matches() { return light; },
    media: query,
    onchange: null,
    addEventListener: media.addEventListener.bind(media),
    removeEventListener: media.removeEventListener.bind(media),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: media.dispatchEvent.bind(media),
  }));
  const { result } = renderHook(useTheme);
  expect(result.current.resolved).toBe("dark");
  act(() => {
    light = true;
    media.dispatchEvent(new Event("change"));
  });
  expect(result.current.resolved).toBe("light");
  expect(document.documentElement).not.toHaveClass("dark");

  act(() => setThemePreference("dark"));
  act(() => media.dispatchEvent(new Event("change")));
  expect(result.current.resolved).toBe("dark");
  expect(document.documentElement).toHaveClass("dark");
});
