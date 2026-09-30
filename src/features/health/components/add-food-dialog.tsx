import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AmountStep } from "./amount-step";
import { type ProductDraft, ProductForm } from "./product-form";
import { ProductSearch } from "./product-search";
import { BarcodeScanner } from "../scanner/barcode-scanner";
import { ApiError } from "@/api/client";
import { fithealth } from "@/api/fithealth";
import { queryKeys } from "@/api/query-keys";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/lib/i18n";
import { newId } from "@/lib/id";
import type { Candidate, Product } from "@/schemas/health";

type Step =
  | { kind: "search" }
  | { kind: "scan" }
  | { kind: "looking-up"; code: string }
  | { kind: "create"; draft: ProductDraft }
  | { kind: "amount"; product: Product };

/** An Open Food Facts listing becomes the starting point of a product the user confirms */
const draftFrom = (candidate: Candidate): ProductDraft => ({ ...candidate, source: "off" });

/** Search, scan or create a product, then log an amount of it into `meal` on `date` */
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
      fithealth.putEntry(entryId, { date, meal_id: meal.id, product_id: product.id, amount: grams }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.health.day(date) });
      void queryClient.invalidateQueries({ queryKey: ["health", "products"] });
      toast.success(t("Added to {meal}", { meal: mealName }));
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t("Could not save. Try again.")),
  });
  const lookUp = useMutation({
    mutationFn: (code: string) => fithealth.lookupBarcode(code),
    onMutate: (code) => setStep({ kind: "looking-up", code }),
    onSuccess: (result, code) => {
      if (result.status === "found") setStep({ kind: "amount", product: result.product });
      else if (result.status === "off") setStep({ kind: "create", draft: draftFrom(result.candidate) });
      else setStep({ kind: "create", draft: { name: "", barcode: code } });
    },
    onError: (error, code) => {
      toast.error(error instanceof ApiError ? error.message : t("Could not look up the barcode. Fill the product in yourself."));
      setStep({ kind: "create", draft: { name: "", barcode: code } });
    },
  });

  const title =
    step.kind === "create" ? t("New product") : step.kind === "scan" || step.kind === "looking-up" ? t("Scan barcode") : t("Add to {meal}", { meal: mealName });

  return (
    <ResponsiveDialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())} title={title}>
      {step.kind === "search" ? (
        <ProductSearch
          query={query}
          onQueryChange={setQuery}
          onPick={(product) => setStep({ kind: "amount", product })}
          onPickCandidate={(candidate) => setStep({ kind: "create", draft: draftFrom(candidate) })}
          onScan={() => setStep({ kind: "scan" })}
          onCreate={() => setStep({ kind: "create", draft: { name: query.trim() } })}
        />
      ) : null}
      {step.kind === "scan" ? <BarcodeScanner onDetected={(code) => lookUp.mutate(code)} onCancel={() => setStep({ kind: "search" })} /> : null}
      {step.kind === "looking-up" ? (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">{t("Looking up {code}…", { code: step.code })}</p>
      ) : null}
      {step.kind === "create" ? (
        <ProductForm initial={step.draft} onCancel={() => setStep({ kind: "search" })} onSaved={(product) => setStep({ kind: "amount", product })} />
      ) : null}
      {step.kind === "amount" ? (
        <AmountStep
          food={step.product}
          submitLabel={t("Add to {meal}", { meal: mealName })}
          pending={save.isPending}
          onBack={() => setStep({ kind: "search" })}
          onSubmit={(grams) => save.mutate({ product: step.product, grams }, { onSuccess: close })}
        />
      ) : null}
    </ResponsiveDialog>
  );
}
