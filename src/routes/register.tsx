import { t } from "@/lib/i18n";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { RegisterForm } from "@/features/auth/components/register-form";
import { isAuthenticated } from "@/features/auth/session";

export const Route = createFileRoute("/register")({
  // Invite links look like /register?invite=<code>
  validateSearch: z.object({ invite: z.string().max(64).optional() }),
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: "/" });
  },
  component: RegisterPage,
});

function RegisterPage() {
  const { invite } = Route.useSearch();
  return (
    <AuthLayout title={t("Join FitTune")} subtitle={t("You need an invite code to create an account.")}>
      <RegisterForm inviteCode={invite} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("Already have an account?")}{" "}
        <Link to="/login" className="font-semibold text-primary-strong underline-offset-4 hover:underline">
          {t("Sign in")}
        </Link>
      </p>
    </AuthLayout>
  );
}
