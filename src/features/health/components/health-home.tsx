import { SaladIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/i18n";

/** Placeholder until the food diary (#28) */
export function HealthHome() {
  return (
    <>
      <PageHeader eyebrow="FitHealth" title={t("Today")} />
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
          <SaladIcon className="size-6 shrink-0 text-primary-strong" aria-hidden />
          <p>{t("Your food diary arrives here soon.")}</p>
        </CardContent>
      </Card>
    </>
  );
}
