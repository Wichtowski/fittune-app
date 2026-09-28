import { t } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { routinesQuery } from "@/api/routines";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RoutineList } from "@/features/routines/components/routine-list";

export const Route = createFileRoute("/_app/routines/")({
  loader: ({ context }) => void context.queryClient.prefetchQuery(routinesQuery()),
  component: RoutinesPage,
});

function RoutinesPage() {
  return (
    <>
      <PageHeader
        title={t("Routines")}
        eyebrow={t("Plan your training")}
        actions={
          <Button asChild>
            <Link to="/routines/new">
              <PlusIcon aria-hidden />{" "}{t("Browse plans")}{" "}</Link>
          </Button>
        }
      />
      <RoutineList />
    </>
  );
}
