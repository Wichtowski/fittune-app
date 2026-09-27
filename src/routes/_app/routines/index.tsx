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
        title="Routines"
        eyebrow="Plan your training"
        actions={
          <Button asChild>
            <Link to="/routines/new">
              <PlusIcon aria-hidden /> New
            </Link>
          </Button>
        }
      />
      <RoutineList />
    </>
  );
}
