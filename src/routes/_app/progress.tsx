import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ProgressDashboard } from "@/features/progress/components/progress-dashboard";

export const Route = createFileRoute("/_app/progress")({
  validateSearch: z.object({ range: z.enum(["4w", "12w", "6m", "1y"]).optional().catch(undefined) }),
  component: ProgressPage,
});

function ProgressPage() {
  const { range = "12w" } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <PageHeader title="Progress" eyebrow="Trends, volume & records" />
      <ProgressDashboard range={range} onRangeChange={(next) => void navigate({ search: { range: next }, replace: true })} />
    </>
  );
}
