import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** ODbL asks for credit wherever Open Food Facts data is shown */
export function OffAttribution({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t("Data from")}{" "}
      <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
        Open Food Facts
      </a>{" "}
      (ODbL)
    </p>
  );
}
