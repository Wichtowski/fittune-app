import { createFileRoute, redirect } from "@tanstack/react-router";

import { meQuery } from "@/api/auth";
import { AppShell } from "@/components/layout/app-shell";
import { isAuthenticated } from "@/features/auth/session";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    // Refresh the profile in the background; offline starts use the persisted copy.
    void context.queryClient.prefetchQuery(meQuery());
  },
  component: AppShell,
});
