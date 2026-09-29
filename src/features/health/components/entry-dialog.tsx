import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AmountStep } from "./amount-step";
import { ApiError } from "@/api/client";
import { fithealth } from "@/api/fithealth";
import { mealsQuery } from "@/api/health";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/i18n";
import type { Entry } from "@/schemas/health";

function EntryEditor({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const queryClient = useQueryClient();
  const meals = useQuery(mealsQuery());
  const [mealId, setMealId] = useState(entry.meal_id);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.health.day(entry.date) });
  const failed = (error: Error) => toast.error(error instanceof ApiError ? error.message : t("Could not save. Try again."));

  const save = useMutation({
    mutationFn: (grams: number) =>
      fithealth.putEntry(entry.id, { date: entry.date, meal_id: mealId, product_id: entry.product_id ?? "", grams }),
    onSuccess: refresh,
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: () => fithealth.deleteEntry(entry.id),
    onSuccess: () => {
      toast.success(t("Removed"));
      refresh();
    },
    onError: failed,
  });
  const pending = save.isPending || remove.isPending;
  // A meal deleted since keeps its entries, so it may be missing from the active list
  const options = meals.data ?? [];

  return (
    <div className="grid gap-4">
      {options.length > 0 && entry.product_id ? (
        <div className="grid gap-2">
          <Label htmlFor="entry-meal">{t("Meal")}</Label>
          <Select value={mealId} onValueChange={setMealId} disabled={pending}>
            <SelectTrigger id="entry-meal"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.some((m) => m.id === mealId) ? null : <SelectItem value={mealId}>{t("Deleted meal")}</SelectItem>}
              {options.map((meal) => <SelectItem key={meal.id} value={meal.id}>{t(meal.name)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {entry.product_id ? (
        <AmountStep
          food={{ name: entry.product_name, brand: entry.product_brand, per_100g: entry.per_100g }}
          initialGrams={entry.grams}
          submitLabel={t("Save")}
          pending={pending}
          onSubmit={(grams) => save.mutate(grams, { onSuccess: onDone })}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("This product no longer exists, so the entry can only be removed.")}</p>
      )}
      <Button variant="ghost" className="text-destructive" disabled={pending} onClick={() => remove.mutate(undefined, { onSuccess: onDone })}>
        <Trash2Icon aria-hidden /> {t("Remove from diary")}
      </Button>
    </div>
  );
}

/** Change how much of a logged food was eaten, move it to another meal, or remove it */
export function EntryDialog({ entry, onOpenChange }: { entry: Entry | null; onOpenChange: (open: boolean) => void }) {
  return (
    <ResponsiveDialog open={entry !== null} onOpenChange={onOpenChange} title={t("Edit entry")}>
      {entry ? <EntryEditor key={entry.id} entry={entry} onDone={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}
