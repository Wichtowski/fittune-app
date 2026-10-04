import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/**
 * Loads the next page of a list when scrolled near, with a button for keyboards and browsers
 * without IntersectionObserver. Give it a `key` that changes with every page: an observer only
 * reports changes, so one that is still in view after a page was added would stay silent.
 */
export function LoadMore({ onLoadMore }: { onLoadMore: () => void }) {
  const observe = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || typeof IntersectionObserver === "undefined") return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
        },
        { rootMargin: "400px" },
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [onLoadMore],
  );

  return (
    <div ref={observe} className="flex justify-center py-2">
      <Button type="button" variant="secondary" size="sm" onClick={onLoadMore}>
        {t("Show more")}
      </Button>
    </div>
  );
}
