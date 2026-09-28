import { t } from "@/lib/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EquipmentChecklist } from "./equipment-checklist";
import { placeKindLabels, placePresets } from "../presets";
import { fittune } from "@/api/fittune";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { applyServerErrors } from "@/lib/form-errors";
import { PLACE_KINDS, type Place, type PlaceInput, placeInputSchema } from "@/schemas/place";

export function PlaceForm({ id, place, onDone }: { id: string; place?: Place; onDone: () => void }) {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const form = useForm<PlaceInput>({
    resolver: zodResolver(placeInputSchema),
    defaultValues: place ? { name: place.name, kind: place.kind, equipment: [...place.equipment] } : { ...placePresets.home, name: t(placePresets.home.name) },
  });
  const mutation = useMutation({
    mutationFn: (values: PlaceInput) => fittune.savePlace(id, values),
    onSuccess: (saved) => {
      queryClient.setQueryData<Place[]>(queryKeys.places, (current = []) => [...current.filter((p) => p.id !== saved.id), saved]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.places });
      toast.success(place ? t("Place updated. Existing workouts keep their setup.") : t("Place added"));
      onDone();
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        {!place ? (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t("Start with a template")}</legend>
            <div className="flex gap-2">
              {PLACE_KINDS.map((kind) => <Button key={kind} type="button" variant="secondary" size="sm" onClick={() => form.reset({ ...placePresets[kind], name: t(placePresets[kind].name) })}>{t(placeKindLabels[kind])}</Button>)}
            </div>
            <p className="text-xs text-muted-foreground">{t("Suggested equipment only. Review the list to match your setup.")}</p>
          </fieldset>
        ) : null}
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>{t("Place name")}</FormLabel><FormControl><Input {...field} placeholder={t("e.g. Home or Downtown gym")} maxLength={80} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="kind" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Place type")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{PLACE_KINDS.map((kind) => <SelectItem key={kind} value={kind}>{t(placeKindLabels[kind])}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="equipment" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Available equipment")}</FormLabel>
            <EquipmentChecklist value={field.value} onChange={field.onChange} />
            <p className="text-xs text-muted-foreground">{t("Bodyweight exercises are always available. Leave all equipment unchecked for a bodyweight-only place.")}</p>
            <FormMessage />
          </FormItem>
        )} />
        {!online ? <p className="text-sm text-muted-foreground">{t("Connect to save changes to places.")}</p> : null}
        <Button type="submit" disabled={!online || mutation.isPending}>{mutation.isPending ? t("Saving…") : place ? t("Save place") : t("Add place")}</Button>
      </form>
    </Form>
  );
}
