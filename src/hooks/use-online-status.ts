import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/** Online state as TanStack Query sees it, so UI and paused mutations always agree. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}
