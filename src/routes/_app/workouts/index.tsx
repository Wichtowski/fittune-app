import { t } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";

import { workoutsInfiniteQuery } from "@/api/workouts";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { WorkoutHistory } from "@/features/workouts/components/workout-history";

export const Route = createFileRoute("/_app/workouts/")({
  loader: ({ context }) => void context.queryClient.prefetchInfiniteQuery(workoutsInfiniteQuery("completed")),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <>
      <PageHeader
        title={t("History")}
        eyebrow={t("Every session you've logged")}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link to="/routines">{t("Routines")}</Link>
          </Button>
        }
      />
      <WorkoutHistory />
    </>
  );
}
