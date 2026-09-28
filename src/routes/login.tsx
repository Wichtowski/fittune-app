import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm, safeRedirect } from "@/features/auth/components/login-form";
import { isAuthenticated } from "@/features/auth/session";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ search }) => {
    if (isAuthenticated()) throw redirect({ href: safeRedirect(search.redirect) });
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your training.">
      <LoginForm redirectTo={redirectTo} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Got an invite?{" "}
        <Link to="/register" className="font-semibold text-primary-strong underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
