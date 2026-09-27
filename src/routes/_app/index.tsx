import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/features/home/components/dashboard";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});
