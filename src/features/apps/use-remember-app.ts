import { useEffect } from "react";

import { useLastApp } from "./store";
import { useActiveApp, useRouteApp } from "./use-active-app";

/**
 * Records the app of the page in use, so `/` reopens it, and exposes the active app on
 * `<html data-app>` so its accent colour also reaches portals such as sheets and dialogs
 */
export function useRememberApp() {
  const routeApp = useRouteApp();
  const activeApp = useActiveApp();
  const setLastApp = useLastApp((state) => state.setLastApp);

  useEffect(() => {
    if (routeApp) setLastApp(routeApp);
  }, [routeApp, setLastApp]);

  useEffect(() => {
    document.documentElement.dataset.app = activeApp;
    return () => {
      delete document.documentElement.dataset.app;
    };
  }, [activeApp]);
}
