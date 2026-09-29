import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type * as React from "react";

import type { AppId } from "@/features/apps/apps";

/**
 * Renders `ui` as the page at `path` of a one-route router, so components that use links,
 * matches or `staticData` work without the whole app
 */
export function renderInRouter(ui: () => React.ReactNode, { path = "/", app }: { path?: string; app?: AppId } = {}) {
  const root = createRootRoute({ component: Outlet });
  const page = createRoute({ getParentRoute: () => root, path, staticData: app ? { app } : {}, component: ui });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}
