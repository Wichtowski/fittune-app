import { createFileRoute, Outlet } from "@tanstack/react-router";

import { OnlineOnly } from "@/features/health/components/online-only";

/** Parent of every FitHealth page, all of them need the API */
export const Route = createFileRoute("/_app/health")({
  staticData: { app: "health" },
  component: HealthLayout,
});

function HealthLayout() {
  return (
    <OnlineOnly>
      <Outlet />
    </OnlineOnly>
  );
}
