import { PlusIcon } from "lucide-react";

import { formatAmount, scale } from "../nutrition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import type { DayMeal, Entry } from "@/schemas/health";

/** One meal of the day with its entries; tapping an entry edits it */
export function MealCard({ meal, onAdd, onEdit }: { meal: DayMeal; onAdd: () => void; onEdit: (entry: Entry) => void }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-bold tracking-wide uppercase">{t(meal.name)}</h2>
          <p className="text-sm text-muted-foreground tabular">
            {formatAmount(meal.totals.energy_kcal, "kcal")} kcal · {t("P")} {formatAmount(meal.totals.protein_g, "g")} · {t("F")} {formatAmount(meal.totals.fat_g, "g")} · {t("C")} {formatAmount(meal.totals.carbs_g, "g")}
          </p>
        </div>
        {meal.archived ? null : (
          <Button variant="secondary" size="icon" aria-label={t("Add to {meal}", { meal: t(meal.name) })} onClick={onAdd}>
            <PlusIcon aria-hidden />
          </Button>
        )}
      </div>
      {meal.entries.length > 0 ? (
        <ul className="divide-y border-t">
          {meal.entries.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => onEdit(entry)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/60">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{entry.product_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatAmount(entry.amount, entry.unit)} {entry.unit}{entry.product_brand ? ` · ${entry.product_brand}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular">{formatAmount(scale(entry.per_100g, entry.amount).energy_kcal, "kcal")} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-4 text-sm text-muted-foreground">{t("Nothing logged yet")}</p>
      )}
    </Card>
  );
}
