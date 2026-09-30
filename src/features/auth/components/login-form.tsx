import { t } from "@/lib/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { onSignedIn } from "../sign-out";
import { account } from "@/api/account";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/form-errors";
import { type LoginInput, loginInputSchema } from "@/schemas/user";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { login: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: account.login,
    onSuccess: (auth) => {
      onSignedIn(auth);
      void navigate({ href: safeRedirect(redirectTo), replace: true });
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-5" noValidate>
        <FormField
          control={form.control}
          name="login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Username or email")}</FormLabel>
              <FormControl>
                <Input autoComplete="username" autoCapitalize="none" autoCorrect="off" {...field} />
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
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={mutation.isPending} className="mt-2">
          {mutation.isPending ? t("Signing in…") : t("Sign in")}
        </Button>
      </form>
    </Form>
  );
}

/** Only follow same-app redirects */
export function safeRedirect(redirect: string | undefined): string {
  if (!redirect?.startsWith("/")) return "/";
  try {
    const url = new URL(redirect, window.location.origin);
    return url.origin === window.location.origin && !url.pathname.startsWith("//") && !url.pathname.startsWith("/login")
      ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
