import { createFileRoute } from "@tanstack/react-router";

import { HealthHome } from "@/features/health/components/health-home";

export const Route = createFileRoute("/_app/health/")({
  component: HealthHome,
});
