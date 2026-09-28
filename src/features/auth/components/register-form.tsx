import { t } from "@/lib/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { onSignedIn } from "../sign-out";
import { account } from "@/api/account";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/form-errors";
import { type RegisterForm as RegisterValues, registerFormSchema } from "@/schemas/user";

export function RegisterForm({ inviteCode = "" }: { inviteCode?: string }) {
  const navigate = useNavigate();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: "", email: "", password: "", confirm_password: "", display_name: "", invite_code: inviteCode },
    mode: "onTouched",
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterValues) =>
      account.register({
        username: values.username,
        email: values.email,
        password: values.password,
        display_name: values.display_name || null,
        invite_code: values.invite_code,
      }),
    onSuccess: (auth) => {
      onSignedIn(auth);
      void navigate({ to: "/", replace: true });
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-5" noValidate>
        <FormField
          control={form.control}
          name="invite_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Invite code")}</FormLabel>
              <FormControl>
                <Input autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="xxxx-xxxx-xxxx-xxxx" {...field} />
              </FormControl>
              <FormDescription>{t("FitTune is invite only. Ask an admin for a code.")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Name (optional)")}</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Username")}</FormLabel>
              <FormControl>
                <Input autoComplete="username" autoCapitalize="none" autoCorrect="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Email")}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>{t("8+ characters with an uppercase letter and a symbol.")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Confirm password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={mutation.isPending} className="mt-2">
          {mutation.isPending ? t("Creating account…") : t("Create account")}
        </Button>
      </form>
    </Form>
  );
}
