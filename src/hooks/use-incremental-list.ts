import { useCallback, useState } from "react";

/**
 * Renders a long list a page at a time. Starts over whenever `items` is a different array, so
 * pass a memoised one: a new array on every render would never get past the first page.
 */
export function useIncrementalList<T>(items: readonly T[], pageSize = 60) {
  const [state, setState] = useState({ items, count: pageSize });
  // Derived instead of reset in an effect, so a new filter never paints the old page count
  const count = state.items === items ? state.count : pageSize;
  const showMore = useCallback(
    () => setState((current) => ({ items, count: (current.items === items ? current.count : pageSize) + pageSize })),
    [items, pageSize],
  );
  return { shown: items.slice(0, count), hasMore: count < items.length, showMore };
}
