import "./styles.css";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { configureApiClient } from "@/api/client";
import { registerMutationDefaults } from "@/api/mutation-defaults";
import { getToken } from "@/features/auth/session";
import { clearLocalSession } from "@/features/auth/sign-out";
import { PERSIST_MAX_AGE, queryClient, queryPersister } from "@/lib/query-client";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Let TanStack Query decide freshness; the router just triggers loaders.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

registerMutationDefaults(queryClient);

configureApiClient({
  getToken,
  onUnauthorized: () => {
    clearLocalSession();
    void router.navigate({ to: "/login", search: { redirect: router.state.location.href } });
  },
});

/** Bump when cached response shapes change so stale persisted data is dropped. */
const CACHE_SCHEMA_VERSION = "1";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE, buster: CACHE_SCHEMA_VERSION }}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
