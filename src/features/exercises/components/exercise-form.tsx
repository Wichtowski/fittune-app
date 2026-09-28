import { t } from "@/lib/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createExercise, updateExercise } from "@/api/exercises";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EquipmentChecklist } from "@/features/places/components/equipment-checklist";
import { applyServerErrors } from "@/lib/form-errors";
import { difficultyLabels, equipmentLabels, muscleLabels, trackingLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { DIFFICULTIES, EQUIPMENT, MUSCLES, TRACKING } from "@/schemas/common";
import { type Exercise, type ExerciseInput, type ExerciseInputForm, exerciseInputSchema } from "@/schemas/exercise";

function defaults(exercise?: Exercise): ExerciseInputForm {
  return {
    name: exercise?.name ?? "",
    tracking: exercise?.tracking ?? "weight_reps",
    primary_muscle: exercise?.primary_muscle ?? "chest",
    secondary_muscles: exercise?.secondary_muscles ?? [],
    equipment: exercise?.equipment ?? "barbell",
    requires: exercise?.requires ?? [],
    difficulty: exercise?.difficulty ?? "beginner",
    video_id: exercise?.video_id ?? "",
    instructions: exercise?.instructions ?? "",
  };
}

/** Create or edit a custom exercise; the same Zod schema validates the form and the request. */
export function ExerciseForm({ exercise, onDone }: { exercise?: Exercise; onDone: (exercise: Exercise) => void }) {
  const queryClient = useQueryClient();
  const form = useForm<ExerciseInputForm, unknown, ExerciseInput>({
    resolver: zodResolver(exerciseInputSchema),
    defaultValues: defaults(exercise),
  });

  const mutation = useMutation({
    mutationFn: (input: ExerciseInput) => (exercise ? updateExercise(exercise.id, input) : createExercise(input)),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.exercises.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercises.all });
      toast.success(exercise ? t("Exercise updated") : t("Exercise created"));
      onDone(saved);
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  const primary = useWatch({ control: form.control, name: "primary_muscle" });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-5" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("e.g. Sled push")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <SelectField control={form.control} name="tracking" label={t("Tracks")} options={TRACKING} labels={trackingLabels} />
          <SelectField control={form.control} name="primary_muscle" label={t("Primary muscle")} options={MUSCLES} labels={muscleLabels} />
          <SelectField control={form.control} name="equipment" label={t("Equipment")} options={EQUIPMENT} labels={equipmentLabels} />
          <SelectField control={form.control} name="difficulty" label={t("Difficulty")} options={DIFFICULTIES} labels={difficultyLabels} />
        </div>

        <FormField
          control={form.control}
          name="secondary_muscles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Secondary muscles")}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {MUSCLES.filter((m) => m !== primary).map((muscle) => {
                  const selected = field.value.includes(muscle);
                  return (
                    <button
                      key={muscle}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        field.onChange(selected ? field.value.filter((m) => m !== muscle) : [...field.value, muscle])
                      }
                      className={cn(
                        "h-9 rounded-full border px-3 text-sm transition-colors",
                        selected && "border-primary bg-primary/15 font-medium",
                      )}
                    >
                      {t(muscleLabels[muscle])}
                    </button>
                  );
                })}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requires"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Equipment needed")}</FormLabel>
              <FormDescription>{t("Everything the exercise needs. It shows up at places that have all of it; leave empty for bodyweight.")}</FormDescription>
              <EquipmentChecklist value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="video_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("YouTube video id")}</FormLabel>
              <FormControl>
                <Input placeholder="dQw4w9WgXcQ" autoCapitalize="none" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>{t("Optional demo video (the 11 characters after “v=”).")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Instructions")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("Setup and cues")} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? t("Saving…") : exercise ? t("Save changes") : t("Create exercise")}
        </Button>
      </form>
    </Form>
  );
}

function SelectField<T extends string>({
  control,
  name,
  label,
  options,
  labels,
}: {
  control: ReturnType<typeof useForm<ExerciseInputForm, unknown, ExerciseInput>>["control"];
  name: "tracking" | "primary_muscle" | "equipment" | "difficulty";
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {labels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
