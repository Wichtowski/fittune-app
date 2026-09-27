import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/page-header";
import { RoutineEditor } from "@/features/routines/components/routine-editor";

export const Route = createFileRoute("/_app/routines/new")({
  component: NewRoutinePage,
});

function NewRoutinePage() {
  return (
    <>
      <PageHeader title="New routine" eyebrow="Plan" />
      <RoutineEditor />
    </>
  );
}
