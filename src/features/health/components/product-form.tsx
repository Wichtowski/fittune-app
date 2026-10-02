import { useSession } from "@/features/auth/session";
import { useState } from "react";
import { LabelScanner } from "../ocr/label-scanner";
import { OCR_FIELDS, type Extraction, type OcrField } from "@/schemas/ocr";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { type Control, type FieldPath, useForm, useWatch } from "react-hook-form";

import { fithealth } from "@/api/fithealth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/form-errors";
import { t } from "@/lib/i18n";
import { OffAttribution } from "./off-attribution";
import { type Nutrients, type Product, type ProductInput, productInputSchema, type Unit, UNITS } from "@/schemas/health";

/** What the form starts from: typed search text, a scanned barcode, or an Open Food Facts listing */
export type ProductDraft = {
  name: string;
  brand?: string | null;
  per_100g?: Nutrients | null;
  serving_amount?: number | null;
  unit?: Unit;
  serving_name?: string | null;
  barcode?: string | null;
  source?: ProductInput["source"];
};

const blankLabel: ProductInput["per_100g"] = {
  energy_kcal: Number.NaN,
  protein_g: Number.NaN,
  fat_g: Number.NaN,
  carbs_g: Number.NaN,
  saturated_fat_g: null,
  sugars_g: null,
  fiber_g: null,
  salt_g: null,
};

const fromDraft = (draft: ProductDraft): ProductInput => ({
  name: draft.name,
  brand: draft.brand ?? null,
  per_100g: draft.per_100g ?? blankLabel,
  serving_amount: draft.serving_amount ?? null,
  unit: draft.unit ?? "g",
  serving_name: draft.serving_name ?? null,
  barcode: draft.barcode ?? null,
  source: draft.source ?? "manual",
});

/** Blank inputs become `null`, so optional values stay unset and required ones fail validation */
const toNumber = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));
const toText = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value : null);

function NumberField({ control, name, label, step = "0.1" }: { control: Control<ProductInput>; name: FieldPath<ProductInput>; label: string; step?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={step}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === "number" && !Number.isNaN(field.value) ? field.value : ""}
              onChange={(event) => field.onChange(toNumber(event.target.value))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** New products go into the shared database, so the label values are checked like the API does */
export function ProductForm({ initial, onSaved, onCancel }: { initial: ProductDraft; onSaved: (product: Product) => void; onCancel: () => void }) {
  const token = useSession((state) => state.token);
  const form = useForm<ProductInput>({ resolver: zodResolver(productInputSchema), defaultValues: fromDraft(initial) });
  const [suggestions, setSuggestions] = useState<Partial<Record<OcrField, { value: number; source: "ocr" | "ai" }>>>({});
  const [scanning, setScanning] = useState(false);
  const applyLabel = (result: Extraction) => {
    if (!result.unit) return;
    const currentUnit = form.getValues("unit");
    const existing = OCR_FIELDS.some((field) => Number.isFinite(form.getValues(`per_100g.${field}`)));
    if (currentUnit !== result.unit && (existing || form.getFieldState("unit").isDirty)) {
      form.setError("root", { message: t("Suggestion units differ from your form. Choose the matching unit before applying.") });
      return;
    }
    form.clearErrors("root");
    let applied = false;
    for (const field of OCR_FIELDS) {
      const path = `per_100g.${field}` as const;
      const value = result.values[field];
      if (value !== null && !form.getFieldState(path).isDirty && !Number.isFinite(form.getValues(path))) {
        form.setValue(path, value, { shouldDirty: true, shouldValidate: true });
        setSuggestions((prior) => ({ ...prior, [field]: { value, source: result.source } }));
        applied = true;
      }
    }
    if (applied) {
      form.setValue("unit", result.unit, { shouldDirty: true });
      setScanning(false);
    }
  };
  const unit = useWatch({ control: form.control, name: "unit" });
  const mutation = useMutation({
    mutationFn: fithealth.createProduct,
    onError: (error) => applyServerErrors(error, form.setError),
  });

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => {
        const retained = Object.entries(suggestions).filter(([field, suggestion]) => values.per_100g[field as OcrField] === suggestion?.value).map(([, suggestion]) => suggestion?.source);
        const source = initial.source === "off" ? "off" : retained.includes("ai") ? "ai" : retained.includes("ocr") ? "ocr" : initial.source ?? "manual";
        mutation.mutate({ ...values, source }, { onSuccess: onSaved });
      })} noValidate>
        {initial.barcode ? (
          <p className="text-sm text-muted-foreground">{t("Barcode")}: <span className="font-medium text-foreground tabular">{initial.barcode}</span></p>
        ) : null}
        {initial.source === "off" ? (
          <p className="rounded-xl bg-muted p-3 text-sm">{t("Check these values against the pack, then save. Everyone will use this product.")}</p>
        ) : null}
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>{t("Name")}</FormLabel><FormControl><Input {...field} maxLength={120} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="brand" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Brand")}</FormLabel>
            <FormControl><Input name={field.name} ref={field.ref} onBlur={field.onBlur} value={field.value ?? ""} onChange={(event) => field.onChange(toText(event.target.value))} maxLength={80} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="unit" render={({ field }) => (
          <fieldset className="flex gap-4">
            <legend className="mb-2 text-sm font-medium">{t("As on the label")}</legend>
            {UNITS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name={field.name} value={value} checked={field.value === value} onChange={() => field.onChange(value)} onBlur={field.onBlur} ref={field.ref} />
                {t(`Per 100 ${value}`)}
              </label>
            ))}
          </fieldset>
        )} />
        {scanning ? <LabelScanner key={token} onApply={applyLabel} onClose={() => setScanning(false)} /> : <Button type="button" variant="outline" onClick={() => setScanning(true)}>{t("Read nutrition label")}</Button>}
        {form.formState.errors.root ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p> : null}
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium">{t(`Per 100 ${unit}, as on the label`)}</legend>
          <div className="grid grid-cols-2 gap-3">
            <NumberField control={form.control} name="per_100g.energy_kcal" label={t("Energy (kcal)")} step="1" />
            <NumberField control={form.control} name="per_100g.protein_g" label={t("Protein (g)")} />
            <NumberField control={form.control} name="per_100g.fat_g" label={t("Fat (g)")} />
            <NumberField control={form.control} name="per_100g.saturated_fat_g" label={t("of which saturates (g)")} />
            <NumberField control={form.control} name="per_100g.carbs_g" label={t("Carbohydrate (g)")} />
            <NumberField control={form.control} name="per_100g.sugars_g" label={t("of which sugars (g)")} />
            <NumberField control={form.control} name="per_100g.fiber_g" label={t("Fibre (g)")} />
            <NumberField control={form.control} name="per_100g.salt_g" label={t("Salt (g)")} step="0.01" />
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <NumberField control={form.control} name="serving_amount" label={t(`Serving (${unit})`)} step="1" />
          <FormField control={form.control} name="serving_name" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Serving name")}</FormLabel>
              <FormControl><Input name={field.name} ref={field.ref} onBlur={field.onBlur} value={field.value ?? ""} onChange={(event) => field.onChange(toText(event.target.value))} placeholder={t("e.g. 1 slice")} maxLength={40} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        {initial.source === "off" ? <OffAttribution /> : <p className="text-xs text-muted-foreground">{t("Products are shared with everyone using FitHealth.")}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>{t("Back")}</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t("Saving…") : t("Save product")}</Button>
        </div>
      </form>
    </Form>
  );
}
