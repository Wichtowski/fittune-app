import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useIncrementalList } from "./use-incremental-list";

const numbers = (count: number) => Array.from({ length: count }, (_, i) => i);

describe("useIncrementalList", () => {
  it("shows a page at a time until the list ends", () => {
    const items = numbers(25);
    const { result } = renderHook(() => useIncrementalList(items, 10));
    expect(result.current.shown).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.showMore());
    expect(result.current.shown).toHaveLength(20);
    act(() => result.current.showMore());
    expect(result.current.shown).toEqual(items);
    expect(result.current.hasMore).toBe(false);
  });

  it("starts over when the list changes", () => {
    const { result, rerender } = renderHook(({ items }) => useIncrementalList(items, 10), { initialProps: { items: numbers(40) } });
    act(() => result.current.showMore());
    expect(result.current.shown).toHaveLength(20);

    const filtered = numbers(15);
    rerender({ items: filtered });
    expect(result.current.shown).toHaveLength(10);
    act(() => result.current.showMore());
    expect(result.current.shown).toEqual(filtered);
  });

  it("keeps its place when rerendered with the same list", () => {
    const items = numbers(40);
    const { result, rerender } = renderHook(() => useIncrementalList(items, 10));
    act(() => result.current.showMore());
    rerender();
    expect(result.current.shown).toHaveLength(20);
  });
});
