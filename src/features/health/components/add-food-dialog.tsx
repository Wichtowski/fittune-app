import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AmountStep } from "./amount-step";
import { ProductForm } from "./product-form";
import { ProductSearch } from "./product-search";
import { ApiError } from "@/api/client";
import { fithealth } from "@/api/fithealth";
import { queryKeys } from "@/api/query-keys";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/lib/i18n";
import { newId } from "@/lib/id";
import type { Product } from "@/schemas/health";

type Step = { kind: "search" } | { kind: "create" } | { kind: "amount"; product: Product };

/** Search or create a product, then log an amount of it into `meal` on `date` */
export function AddFoodDialog({ open, onOpenChange, date, meal }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  meal: { id: string; name: string };
}) {
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();
  const mealName = t(meal.name);

  // One id per food being added: a retried save updates instead of logging it twice, and the
  // next food gets a fresh id
  const [entryId, setEntryId] = useState(newId);
  const close = () => {
    onOpenChange(false);
    setStep({ kind: "search" });
    setQuery("");
    setEntryId(newId());
  };
  const save = useMutation({
    mutationFn: ({ product, grams }: { product: Product; grams: number }) =>
      fithealth.putEntry(entryId, { date, meal_id: meal.id, product_id: product.id, grams }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.health.day(date) });
      void queryClient.invalidateQueries({ queryKey: ["health", "products"] });
      toast.success(t("Added to {meal}", { meal: mealName }));
      close();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t("Could not save. Try again.")),
  });

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={step.kind === "create" ? t("New product") : t("Add to {meal}", { meal: mealName })}
    >
      {step.kind === "search" ? (
        <ProductSearch query={query} onQueryChange={setQuery} onPick={(product) => setStep({ kind: "amount", product })} onCreate={() => setStep({ kind: "create" })} />
      ) : null}
      {step.kind === "create" ? (
        <ProductForm initialName={query.trim()} onCancel={() => setStep({ kind: "search" })} onSaved={(product) => setStep({ kind: "amount", product })} />
      ) : null}
      {step.kind === "amount" ? (
        <AmountStep
          food={step.product}
          submitLabel={t("Add to {meal}", { meal: mealName })}
          pending={save.isPending}
          onBack={() => setStep({ kind: "search" })}
          onSubmit={(grams) => save.mutate({ product: step.product, grams })}
        />
      ) : null}
    </ResponsiveDialog>
  );
}
