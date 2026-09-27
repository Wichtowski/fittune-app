import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { type Control, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { emptySetTarget, newExerciseEntry, toRoutineForm, toRoutineInput } from "../mapping";
import { queryKeys } from "@/api/query-keys";
import { createRoutine, deleteRoutine, updateRoutine } from "@/api/routines";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExercisePicker } from "@/features/exercises/components/exercise-picker";
import { usePreferences } from "@/hooks/use-preferences";
import { applyServerErrors } from "@/lib/form-errors";
import { setKindLabels } from "@/lib/labels";
import { SET_KINDS } from "@/schemas/common";
import { type Routine, type RoutineFormInput, type RoutineFormOutput, routineFormSchema } from "@/schemas/routine";

type FormControlType = Control<RoutineFormInput, unknown, RoutineFormOutput>;

export function RoutineEditor({ routine }: { routine?: Routine }) {
  const units = usePreferences();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

  const form = useForm<RoutineFormInput, unknown, RoutineFormOutput>({
    resolver: zodResolver(routineFormSchema),
    defaultValues: toRoutineForm(routine, units),
  });
  const exercises = useFieldArray({ control: form.control, name: "exercises" });

  const save = useMutation({
    mutationFn: (values: RoutineFormOutput) => {
      const input = toRoutineInput(values, units);
      return routine ? updateRoutine(routine.id, input) : createRoutine(input);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.routines.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.list });
      toast.success(routine ? "Routine saved" : "Routine created");
      void navigate({ to: "/routines" });
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  const remove = useMutation({
    mutationFn: () => deleteRoutine(routine?.id ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      toast.success("Routine deleted");
      void navigate({ to: "/routines", replace: true });
    },
    onError: () => toast.error("Couldn't delete the routine."),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]" noValidate>
        <div className="grid content-start gap-5 lg:sticky lg:top-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Upper body A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Goal, progression scheme…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="hidden gap-2 lg:grid">
            <Button type="submit" size="lg" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save routine"}
            </Button>
            {routine ? <DeleteRoutine onConfirm={() => remove.mutate()} /> : null}
          </div>
        </div>

        <div className="grid content-start gap-3">
          {form.formState.errors.exercises?.message ? (
            <p className="text-sm text-destructive">{form.formState.errors.exercises.message}</p>
          ) : null}
          {exercises.fields.map((field, index) => (
            <ExerciseTargets
              key={field.id}
              control={form.control}
              index={index}
              name={field.exercise_name}
              tracking={field.tracking}
              isFirst={index === 0}
              isLast={index === exercises.fields.length - 1}
              onMove={(direction) => exercises.move(index, index + direction)}
              onRemove={() => exercises.remove(index)}
              weightUnit={units.weightUnit}
              distanceUnit={units.distanceUnit}
            />
          ))}
          <Button type="button" variant="secondary" size="lg" onClick={() => setPickerOpen(true)}>
            <PlusIcon aria-hidden /> Add exercises
          </Button>
          <div className="grid gap-2 lg:hidden">
            <Button type="submit" size="lg" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save routine"}
            </Button>
            {routine ? <DeleteRoutine onConfirm={() => remove.mutate()} /> : null}
          </div>
        </div>

        <ExercisePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(picked) => exercises.append(picked.map(newExerciseEntry))}
        />
      </form>
    </Form>
  );
}

type ExerciseTargetsProps = {
  control: FormControlType;
  index: number;
  name: string;
  tracking: RoutineFormInput["exercises"][number]["tracking"];
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  weightUnit: string;
  distanceUnit: string;
};

function ExerciseTargets({
  control,
  index,
  name,
  tracking,
  isFirst,
  isLast,
  onMove,
  onRemove,
  weightUnit,
  distanceUnit,
}: ExerciseTargetsProps) {
  const sets = useFieldArray({ control, name: `exercises.${index}.sets` });
  const columns: { key: "reps" | "weight" | "duration_seconds" | "distance"; label: string }[] =
    tracking === "weight_reps"
      ? [
          { key: "weight", label: weightUnit },
          { key: "reps", label: "Reps" },
        ]
      : tracking === "reps"
        ? [{ key: "reps", label: "Reps" }]
        : tracking === "duration"
          ? [{ key: "duration_seconds", label: "Seconds" }]
          : [
              { key: "distance", label: distanceUnit },
              { key: "duration_seconds", label: "Seconds" },
            ];

  return (
    <section className="rounded-2xl border bg-card p-4" aria-label={name}>
      <div className="mb-3 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-lg font-semibold">{name}</p>
        <Button type="button" variant="ghost" size="icon-sm" disabled={isFirst} onClick={() => onMove(-1)} aria-label="Move up">
          <ArrowUpIcon className="size-4" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={isLast} onClick={() => onMove(1)} aria-label="Move down">
          <ArrowDownIcon className="size-4" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove ${name}`}>
          <Trash2Icon className="size-4" aria-hidden />
        </Button>
      </div>

      <FormField
        control={control}
        name={`exercises.${index}.rest_seconds`}
        render={({ field }) => (
          <FormItem className="mb-3 flex items-center gap-3">
            <FormLabel className="shrink-0">Rest (s)</FormLabel>
            <FormControl>
              <Input inputMode="numeric" className="h-10 w-24" {...field} value={String(field.value ?? "")} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-2">
        {sets.fields.map((set, setIndex) => (
          <div key={set.id} className="flex items-start gap-2">
            <span className="mt-2.5 w-6 shrink-0 text-center font-display text-lg font-bold text-muted-foreground">
              {setIndex + 1}
            </span>
            <FormField
              control={control}
              name={`exercises.${index}.sets.${setIndex}.kind`}
              render={({ field }) => (
                <FormItem className="w-32 shrink-0">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-11" aria-label="Set type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SET_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {setKindLabels[kind].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {columns.map((column) => (
              <FormField
                key={column.key}
                control={control}
                name={`exercises.${index}.sets.${setIndex}.${column.key}`}
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-1">
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder={column.label}
                        aria-label={column.label}
                        className="h-11 text-center"
                        {...field}
                        value={String(field.value ?? "")}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            ))}
            <Button type="button" variant="ghost" size="icon" onClick={() => sets.remove(setIndex)} aria-label={`Remove set ${setIndex + 1}`}>
              <XIcon className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => sets.append(emptySetTarget())}>
        <PlusIcon className="size-4" aria-hidden /> Add set
      </Button>
    </section>
  );
}

function DeleteRoutine({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive">
          <Trash2Icon aria-hidden /> Delete routine
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this routine?</AlertDialogTitle>
          <AlertDialogDescription>Workouts you already did from it are kept.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
