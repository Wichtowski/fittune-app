import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/api/client";
import { fithealth } from "@/api/fithealth";
import { weightsQuery } from "@/api/health";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateString } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";

/** Weight drives the targets and the training estimate, so logging it now and then is enough */
export function WeightLog() {
  const queryClient = useQueryClient();
  const weights = useQuery(weightsQuery());
  const [text, setText] = useState("");
  const kg = Number(text.replace(",", "."));
  const valid = text.trim() !== "" && Number.isFinite(kg) && kg >= 25 && kg <= 400;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.health.weights });
    // Every day's targets depend on the weight in force then
    void queryClient.invalidateQueries({ queryKey: queryKeys.health.days });
  };
  const failed = (error: Error) => toast.error(error instanceof ApiError ? error.message : t("Could not save. Try again."));
  const save = useMutation({
    mutationFn: (weight: number) => fithealth.saveWeight(toDateString(new Date()), weight),
    onSuccess: () => {
      setText("");
      toast.success(t("Weight saved"));
      refresh();
    },
    onError: failed,
  });
  const remove = useMutation({ mutationFn: fithealth.deleteWeight, onSuccess: refresh, onError: failed });

  return (
    <div className="grid gap-4">
      <form
        className="flex items-end gap-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) save.mutate(kg);
        }}
      >
        <div className="grid flex-1 gap-2">
          <Label htmlFor="weight-today">{t("Today's weight (kg)")}</Label>
          <Input id="weight-today" type="number" inputMode="decimal" step="any" value={text} onChange={(event) => setText(event.target.value)} placeholder={weights.data?.[0] ? String(weights.data[0].weight_kg) : "75"} />
        </div>
        <Button type="submit" className="h-12" disabled={!valid || save.isPending}>{t("Save")}</Button>
      </form>
      {weights.data && weights.data.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {weights.data.slice(0, 7).map((weight) => (
            <li key={weight.date} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="text-sm text-muted-foreground">{formatShortDate(weight.date)}</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular">{weight.weight_kg} kg</span>
                <Button variant="ghost" size="icon" aria-label={t("Delete weight from {date}", { date: formatShortDate(weight.date) })} onClick={() => remove.mutate(weight.date)}>
                  <Trash2Icon aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("No weight logged yet. Targets need one.")}</p>
      )}
    </div>
  );
}
