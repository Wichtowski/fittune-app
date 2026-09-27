import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePassword, deleteAccount } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  AlertDialog,
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
import { Separator } from "@/components/ui/separator";
import { clearLocalSession } from "@/features/auth/sign-out";
import { applyServerErrors } from "@/lib/form-errors";
import { type ChangePasswordForm, changePasswordFormSchema } from "@/schemas/user";

export function ChangePassword() {
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: ChangePasswordForm) =>
      changePassword({ current_password: values.current_password, new_password: values.new_password }),
    onSuccess: () => {
      form.reset();
      toast.success("Password changed. Other devices were signed out.");
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-4" noValidate>
        {(["current_password", "new_password", "confirm_password"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {name === "current_password" ? "Current password" : name === "new_password" ? "New password" : "Confirm new password"}
                </FormLabel>
                <FormControl>
                  <Input type="password" autoComplete={name === "current_password" ? "current-password" : "new-password"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" variant="secondary" disabled={mutation.isPending} className="justify-self-start">
          {mutation.isPending ? "Changing…" : "Change password"}
        </Button>
      </form>
    </Form>
  );
}

export function DeleteAccount() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      clearLocalSession({ discardWorkouts: true });
      void navigate({ to: "/register", replace: true });
      toast.success("Your account and all its data were deleted.");
    },
    onError: (err) => setError(err instanceof ApiError ? (err.fields.password ?? err.message) : "Something went wrong."),
  });

  return (
    <AlertDialog onOpenChange={() => setError(null)}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="justify-self-start text-destructive">
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            All workouts, activities, routines and custom exercises are permanently removed. Enter your password to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          type="password"
          autoComplete="current-password"
          aria-label="Password"
          aria-invalid={error !== null}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={!password || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Deleting…" : "Delete forever"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AccountSecurity() {
  return (
    <div className="grid gap-5">
      <ChangePassword />
      <Separator />
      <DeleteAccount />
    </div>
  );
}
