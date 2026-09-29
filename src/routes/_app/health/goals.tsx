import { createFileRoute } from "@tanstack/react-router";

import { GoalsPage } from "@/features/health/components/goals-page";

export const Route = createFileRoute("/_app/health/goals")({
  component: GoalsPage,
});
