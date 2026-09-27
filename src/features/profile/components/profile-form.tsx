import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProfile } from "@/api/auth";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { applyServerErrors } from "@/lib/form-errors";
import { accountTypeLabels } from "@/lib/labels";
import { ACCOUNT_TYPES } from "@/schemas/common";
import { type ProfileForm as ProfileValues, profileFormSchema, type User } from "@/schemas/user";

export function ProfileForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: user.display_name ?? "",
      birthday: user.birthday ?? "",
      account_type: user.account_type ?? "none",
      weight_unit: user.weight_unit,
      distance_unit: user.distance_unit,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileValues) =>
      updateProfile({
        display_name: values.display_name || null,
        birthday: values.birthday || null,
        account_type: values.account_type === "none" ? null : values.account_type,
        weight_unit: values.weight_unit,
        distance_unit: values.distance_unit,
      }),
    // Units change how every screen renders, so apply them before the round trip finishes.
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me });
      const previous = queryClient.getQueryData<User>(queryKeys.me);
      if (previous) {
        queryClient.setQueryData<User>(queryKeys.me, {
          ...previous,
          weight_unit: values.weight_unit,
          distance_unit: values.distance_unit,
        });
      }
      return { previous };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.me, saved);
      form.reset(form.getValues());
      toast.success("Profile saved");
    },
    onError: (error, _values, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.me, context.previous);
      applyServerErrors(error, form.setError);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-5" noValidate>
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="birthday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birthday</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="account_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I am a…</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Prefer not to say</SelectItem>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {accountTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="weight_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <ToggleGroup type="single" value={field.value} onValueChange={(v) => v && field.onChange(v)} className="w-full">
                  <ToggleGroupItem value="kg">Kilograms</ToggleGroupItem>
                  <ToggleGroupItem value="lb">Pounds</ToggleGroupItem>
                </ToggleGroup>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="distance_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance</FormLabel>
                <ToggleGroup type="single" value={field.value} onValueChange={(v) => v && field.onChange(v)} className="w-full">
                  <ToggleGroupItem value="km">Kilometres</ToggleGroupItem>
                  <ToggleGroupItem value="mi">Miles</ToggleGroupItem>
                </ToggleGroup>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty} className="justify-self-start">
          {mutation.isPending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Form>
  );
}
