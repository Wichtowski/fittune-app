import { createFileRoute } from "@tanstack/react-router";

import { meQuery } from "@/api/auth";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/features/auth/session";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    requireAuth(location);
    // Refresh the profile in the background; offline starts use the persisted copy.
    void context.queryClient.prefetchQuery(meQuery());
  },
  component: AppShell,
});
