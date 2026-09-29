import { t } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ActivityForm } from "@/features/activity/components/activity-form";
import { ActivityOverview } from "@/features/activity/components/activity-overview";
import type { Activity } from "@/schemas/activity";

export const Route = createFileRoute("/_app/activity")({
  staticData: { app: "train" },
  validateSearch: z.object({ log: z.boolean().optional() }),
  component: ActivityPage,
});

function ActivityPage() {
  const { log } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState<Activity | undefined>();
  const open = Boolean(log) || editing !== undefined;

  const close = () => {
    setEditing(undefined);
    if (log) void navigate({ search: {}, replace: true });
  };

  return (
    <>
      <PageHeader
        title={t("Activity")}
        eyebrow={t("Runs, rides & everything cardio")}
        actions={
          <Button variant="endurance" onClick={() => void navigate({ search: { log: true } })}>
            <PlusIcon aria-hidden /> <span className="hidden sm:inline">{t("Log activity")}</span>
            <span className="sm:hidden">{t("Log")}</span>
          </Button>
        }
      />
      <ActivityOverview onSelect={setEditing} />
      <ResponsiveDialog
        open={open}
        onOpenChange={(next) => (next ? undefined : close())}
        title={editing ? t("Edit activity") : t("Log activity")}
      >
        <ActivityForm key={editing?.id ?? "new"} activity={editing} onDone={close} />
      </ResponsiveDialog>
    </>
  );
}
