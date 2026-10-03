import { createFileRoute, redirect } from "@tanstack/react-router";

import { offlineReason, useConnectivity } from "@/lib/connectivity";
import { meQuery } from "@/api/auth";
import { AdminPage } from "@/features/admin/admin-page";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async ({ context }) => {
    if (offlineReason(useConnectivity.getState())) throw redirect({ to: "/profile" });
    const user = await context.queryClient.fetchQuery({ ...meQuery(), staleTime: 0, retry: false, networkMode: "always" });
    if (user.role !== "admin") throw redirect({ to: "/profile" });
  },
  component: AdminPage,
});
