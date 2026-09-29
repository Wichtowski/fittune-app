import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Control, type FieldPath, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { fithealth } from "@/api/fithealth";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { applyServerErrors } from "@/lib/form-errors";
import { t } from "@/lib/i18n";
import { ACTIVITIES, type Profile, type ProfileInput, profileInputSchema } from "@/schemas/health";

const activityLabels: Record<(typeof ACTIVITIES)[number], string> = {
  sedentary: "Mostly sitting, desk job",
  light: "Some walking during the day",
  moderate: "On your feet a lot",
  active: "Physical job",
  very_active: "Heavy physical work",
};
const PACES = [0.25, 0.5, 0.75, 1] as const;

const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));

function OptionalNumber({ control, name, label }: { control: Control<ProfileInput>; name: FieldPath<ProfileInput>; label: string }) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input type="number" inputMode="decimal" step="any" placeholder={t("Auto")} name={field.name} ref={field.ref} onBlur={field.onBlur}
            value={typeof field.value === "number" ? field.value : ""} onChange={(event) => field.onChange(toNumber(event.target.value))} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

/** Body data for the calculated targets, and optional targets of your own */
export function BodyProfileForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: {
      sex: profile.sex ?? undefined,
      height_cm: profile.height_cm ?? undefined,
      activity: profile.activity ?? "light",
      goal: profile.goal ?? "maintain",
      pace_kg_per_week: profile.pace_kg_per_week || 0.5,
      energy_kcal: profile.energy_kcal,
      protein_g: profile.protein_g,
      fat_g: profile.fat_g,
      carbs_g: profile.carbs_g,
    },
  });
  const goal = useWatch({ control: form.control, name: "goal" });
  const save = useMutation({
    mutationFn: (values: ProfileInput) => fithealth.saveProfile({ ...values, pace_kg_per_week: values.goal === "maintain" ? 0 : values.pace_kg_per_week }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.health.profile, saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.health.days });
      toast.success(t("Goals saved"));
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
        <FormField control={form.control} name="sex" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Sex")}</FormLabel>
            <FormControl>
              <ToggleGroup type="single" value={field.value ?? ""} onValueChange={(value) => value && field.onChange(value)} className="w-full">
                <ToggleGroupItem value="female">{t("Female")}</ToggleGroupItem>
                <ToggleGroupItem value="male">{t("Male")}</ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="height_cm" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Height (cm)")}</FormLabel>
            <FormControl>
              <Input type="number" inputMode="numeric" step="any" name={field.name} ref={field.ref} onBlur={field.onBlur}
                value={typeof field.value === "number" && !Number.isNaN(field.value) ? field.value : ""} onChange={(event) => field.onChange(toNumber(event.target.value) ?? Number.NaN)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="activity" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Daily life, without training")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>{ACTIVITIES.map((activity) => <SelectItem key={activity} value={activity}>{t(activityLabels[activity])}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("Training logged in FitTune is added on the day, so leave it out here.")}</p>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="goal" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Goal")}</FormLabel>
            <FormControl>
              <ToggleGroup type="single" value={field.value} onValueChange={(value) => value && field.onChange(value)} className="w-full">
                <ToggleGroupItem value="lose">{t("Lose")}</ToggleGroupItem>
                <ToggleGroupItem value="maintain">{t("Keep")}</ToggleGroupItem>
                <ToggleGroupItem value="gain">{t("Gain")}</ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {goal !== "maintain" ? (
          <FormField control={form.control} name="pace_kg_per_week" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Pace")}</FormLabel>
              <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{PACES.map((pace) => <SelectItem key={pace} value={String(pace)}>{t("{kg} kg per week", { kg: pace })}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        ) : null}
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium">{t("Your own targets")}</legend>
          <p className="text-xs text-muted-foreground">{t("Leave empty to use the calculated value. Training is still added on top.")}</p>
          <div className="grid grid-cols-2 gap-3">
            <OptionalNumber control={form.control} name="energy_kcal" label={t("Energy (kcal)")} />
            <OptionalNumber control={form.control} name="protein_g" label={t("Protein (g)")} />
            <OptionalNumber control={form.control} name="fat_g" label={t("Fat (g)")} />
            <OptionalNumber control={form.control} name="carbs_g" label={t("Carbohydrate (g)")} />
          </div>
        </fieldset>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? t("Saving…") : t("Save goals")}</Button>
      </form>
    </Form>
  );
}
