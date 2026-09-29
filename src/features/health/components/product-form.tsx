import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { type Control, type FieldPath, useForm } from "react-hook-form";

import { fithealth } from "@/api/fithealth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/form-errors";
import { t } from "@/lib/i18n";
import { OffAttribution } from "./off-attribution";
import { type Nutrients, type Product, type ProductInput, productInputSchema } from "@/schemas/health";

/** What the form starts from: typed search text, a scanned barcode, or an Open Food Facts listing */
export type ProductDraft = {
  name: string;
  brand?: string | null;
  per_100g?: Nutrients | null;
  serving_g?: number | null;
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
  serving_g: draft.serving_g ?? null,
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
  const form = useForm<ProductInput>({ resolver: zodResolver(productInputSchema), defaultValues: fromDraft(initial) });
  const mutation = useMutation({
    mutationFn: fithealth.createProduct,
    onSuccess: onSaved,
    onError: (error) => applyServerErrors(error, form.setError),
  });

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
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
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium">{t("Per 100 g, as on the label")}</legend>
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
          <NumberField control={form.control} name="serving_g" label={t("Serving (g)")} step="1" />
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
