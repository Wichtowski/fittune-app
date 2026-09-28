import { useMatches } from "@tanstack/react-router";

import type { AppId } from "./apps";
import { useLastApp } from "./store";

type MatchWithApp = { staticData?: { app?: AppId } };

/** The app of the deepest route that declares one, otherwise the last used app, otherwise FitTune */
export function resolveActiveApp(matches: readonly MatchWithApp[], lastApp: AppId | null): AppId {
  return routeApp(matches) ?? lastApp ?? "train";
}

function routeApp(matches: readonly MatchWithApp[]): AppId | undefined {
  for (let i = matches.length - 1; i >= 0; i--) {
    const app = matches[i]?.staticData?.app;
    if (app) return app;
  }
  return undefined;
}

export function useActiveApp(): AppId {
  const matches = useMatches();
  const lastApp = useLastApp((state) => state.lastApp);
  return resolveActiveApp(matches, lastApp);
}

/** The app the current page itself declares, undefined on shared pages */
export function useRouteApp(): AppId | undefined {
  return routeApp(useMatches());
}
