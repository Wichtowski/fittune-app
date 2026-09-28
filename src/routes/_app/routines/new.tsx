import { t } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/page-header";
import { RoutineEditor } from "@/features/routines/components/routine-editor";

export const Route = createFileRoute("/_app/routines/new")({
  component: NewRoutinePage,
});

function NewRoutinePage() {
  return (
    <>
      <PageHeader title={t("New routine")} eyebrow={t("Plan")} />
      <RoutineEditor />
    </>
  );
}
