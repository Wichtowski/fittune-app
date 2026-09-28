import { createFileRoute, redirect } from "@tanstack/react-router";

import { apps } from "@/features/apps/apps";
import { Launcher } from "@/features/apps/components/launcher";
import { useLastApp } from "@/features/apps/store";
import { requireAuth } from "@/features/auth/session";

/** Entry point and the PWA's start URL: reopens the last used app, or lets the user pick one */
export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => {
    requireAuth(location);
    const { lastApp } = useLastApp.getState();
    if (lastApp) throw redirect({ to: apps[lastApp].home, replace: true });
  },
  component: Launcher,
});
