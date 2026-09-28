import "./styles.css";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { configureApiClient } from "@/api/client";
import { registerMutationDefaults } from "@/api/mutation-defaults";
import { getToken } from "@/features/auth/session";
import { clearLocalSession } from "@/features/auth/sign-out";
import { startConnectivity } from "@/lib/connectivity";
import { PERSIST_MAX_AGE, queryClient, queryPersister, shouldPersistQuery } from "@/lib/query-client";
import { LocaleProvider } from "@/lib/i18n";
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
// Before rendering, so the first queries already know whether to use the network
startConnectivity();

configureApiClient({
  getToken,
  onUnauthorized: () => {
    clearLocalSession();
    void router.navigate({ to: "/login", search: { redirect: router.state.location.href } });
  },
});

/** Bump when cached response shapes change so stale persisted data is dropped. */
// 2: exercises gained `requires` and places list equipment items instead of categories
const CACHE_SCHEMA_VERSION = "2";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        buster: CACHE_SCHEMA_VERSION,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      <LocaleProvider><RouterProvider router={router} /></LocaleProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
