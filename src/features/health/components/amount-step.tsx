import { useState } from "react";

import { formatAmount, scale } from "../nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import type { Nutrients } from "@/schemas/health";

type Food = { name: string; brand: string | null; per_100g: Nutrients; serving_g?: number | null; serving_name?: string | null };

/** Chooses how much was eaten, with what that amount contains updating as the user types */
export function AmountStep({ food, initialGrams, submitLabel, pending, onSubmit, onBack }: {
  food: Food;
  initialGrams?: number;
  submitLabel: string;
  pending: boolean;
  onSubmit: (grams: number) => void;
  onBack?: () => void;
}) {
  const [text, setText] = useState(String(initialGrams ?? food.serving_g ?? 100));
  const grams = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(grams) && grams > 0 && grams <= 5000;
  const amount = scale(food.per_100g, valid ? grams : 0);

  return (
    <form
      className="grid gap-4"
      // Validity is decided here, browser step rules would reject amounts like 50 g
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit(grams);
      }}
    >
      <div>
        <p className="font-semibold">{food.name}</p>
        {food.brand ? <p className="text-sm text-muted-foreground">{food.brand}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount-grams">{t("Amount (g)")}</Label>
        <Input id="amount-grams" type="number" inputMode="decimal" min={0} max={5000} step="any" value={text} onChange={(event) => setText(event.target.value)} autoFocus />
        {food.serving_g ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2].map((count) => (
              <Button key={count} type="button" variant="secondary" size="sm" onClick={() => setText(String((food.serving_g ?? 0) * count))}>
                {count}× {food.serving_name ?? t("serving")} ({formatAmount((food.serving_g ?? 0) * count, "g")} g)
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <dl className="grid grid-cols-4 gap-2 rounded-xl bg-muted p-3 text-center text-sm">
        <div><dt className="text-xs text-muted-foreground">{t("Energy")}</dt><dd className="font-semibold tabular">{formatAmount(amount.energy_kcal, "kcal")} kcal</dd></div>
        <div><dt className="text-xs text-muted-foreground">{t("Protein")}</dt><dd className="tabular">{formatAmount(amount.protein_g, "g")} g</dd></div>
        <div><dt className="text-xs text-muted-foreground">{t("Fat")}</dt><dd className="tabular">{formatAmount(amount.fat_g, "g")} g</dd></div>
        <div><dt className="text-xs text-muted-foreground">{t("Carbs")}</dt><dd className="tabular">{formatAmount(amount.carbs_g, "g")} g</dd></div>
      </dl>
      <div className={onBack ? "grid grid-cols-2 gap-2" : "grid"}>
        {onBack ? <Button type="button" variant="secondary" onClick={onBack}>{t("Back")}</Button> : null}
        <Button type="submit" disabled={!valid || pending}>{pending ? t("Saving…") : submitLabel}</Button>
      </div>
    </form>
  );
}
