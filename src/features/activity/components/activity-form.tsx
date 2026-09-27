import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useForm } from "react-hook-form";

import { activityIcons } from "../meta";
import { defaultTitle, toActivityInput, toFormValues } from "../mapping";
import { useDeleteActivity, useSaveActivity } from "../use-activity-mutations";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/hooks/use-preferences";
import { newId } from "@/lib/id";
import { activityLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  type Activity,
  type ActivityFormInput,
  type ActivityFormOutput,
  activityFormSchema,
} from "@/schemas/activity";
import { ACTIVITY_KINDS } from "@/schemas/common";

type ActivityFormProps = { activity?: Activity; onDone: () => void };

/** Quick log for runs, rides and other endurance sessions. Saves optimistically. */
export function ActivityForm({ activity, onDone }: ActivityFormProps) {
  const { distanceUnit } = usePreferences();
  const save = useSaveActivity();
  const remove = useDeleteActivity();
  const form = useForm<ActivityFormInput, unknown, ActivityFormOutput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: toFormValues(activity, distanceUnit),
  });

  const onSubmit = (values: ActivityFormOutput) => {
    // Client-generated id: retrying (or replaying after offline) never creates duplicates.
    save.mutate({ id: activity?.id ?? newId(), input: toActivityInput(values, distanceUnit) });
    onDone();
  };

  const titleIsDefault = (title: string) => ACTIVITY_KINDS.some((kind) => title === defaultTitle(kind));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <div role="radiogroup" aria-label="Activity type" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {ACTIVITY_KINDS.map((kind) => {
                  const Icon = activityIcons[kind];
                  const selected = field.value === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        field.onChange(kind);
                        if (titleIsDefault(form.getValues("title"))) form.setValue("title", defaultTitle(kind));
                      }}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium transition-colors",
                        selected ? "border-endurance bg-endurance/15 text-foreground" : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <Icon className={cn("size-5", selected && "text-endurance-strong")} aria-hidden />
                      {activityLabels[kind]}
                    </button>
                  );
                })}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="started_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium text-muted-foreground">Duration</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["hours", "minutes", "seconds"] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          inputMode="numeric"
                          aria-label={name}
                          className="pr-10 text-center font-display text-xl font-semibold"
                          {...field}
                          value={String(field.value ?? "")}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                          {name.slice(0, 1)}
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
          {form.formState.errors.minutes ? (
            <p className="text-sm text-destructive">{form.formState.errors.minutes.message}</p>
          ) : null}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="distance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance ({distanceUnit})</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} value={String(field.value ?? "")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="avg_heart_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avg heart rate</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="bpm" {...field} value={String(field.value ?? "")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="elevation_gain_m"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Elevation gain (m)</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} value={String(field.value ?? "")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="perceived_effort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effort (1–10)</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} value={String(field.value ?? "")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="How did it feel?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          {activity ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              aria-label="Delete activity"
              onClick={() => {
                remove.mutate(activity.id);
                onDone();
              }}
            >
              <Trash2Icon aria-hidden />
            </Button>
          ) : null}
          <Button type="submit" size="lg" variant="endurance" className="flex-1">
            {activity ? "Save changes" : "Log activity"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
