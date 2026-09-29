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

/** Change how much of a logged food was eaten, move it to another meal, or remove it */
export function EntryDialog({ entry, onOpenChange }: { entry: Entry | null; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const meals = useQuery({ ...mealsQuery(), enabled: entry !== null });
  const [mealId, setMealId] = useState<string | null>(null);
  const done = () => {
    if (entry) void queryClient.invalidateQueries({ queryKey: queryKeys.health.day(entry.date) });
    setMealId(null);
    onOpenChange(false);
  };
  const failed = (error: Error) => toast.error(error instanceof ApiError ? error.message : t("Could not save. Try again."));

  const save = useMutation({
    mutationFn: ({ entry, grams, mealId }: { entry: Entry; grams: number; mealId: string }) =>
      fithealth.putEntry(entry.id, { date: entry.date, meal_id: mealId, product_id: entry.product_id ?? "", grams }),
    onSuccess: done,
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: (entry: Entry) => fithealth.deleteEntry(entry.id),
    onSuccess: () => {
      toast.success(t("Removed"));
      done();
    },
    onError: failed,
  });

  const currentMeal = mealId ?? entry?.meal_id ?? "";
  // A meal deleted since keeps its entries, so it may be missing from the active list
  const options = meals.data ?? [];

  return (
    <ResponsiveDialog open={entry !== null} onOpenChange={(open) => (open ? onOpenChange(true) : done())} title={t("Edit entry")}>
      {entry ? (
        <div className="grid gap-4">
          {options.length > 0 && entry.product_id ? (
            <div className="grid gap-2">
              <Label htmlFor="entry-meal">{t("Meal")}</Label>
              <Select value={currentMeal} onValueChange={setMealId}>
                <SelectTrigger id="entry-meal"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.some((m) => m.id === currentMeal) ? null : <SelectItem value={currentMeal}>{t("Deleted meal")}</SelectItem>}
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
              pending={save.isPending}
              onSubmit={(grams) => save.mutate({ entry, grams, mealId: currentMeal })}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("This product no longer exists, so the entry can only be removed.")}</p>
          )}
          <Button variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => remove.mutate(entry)}>
            <Trash2Icon aria-hidden /> {t("Remove from diary")}
          </Button>
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
