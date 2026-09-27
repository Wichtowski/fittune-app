import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { RegisterForm } from "@/features/auth/components/register-form";
import { isAuthenticated } from "@/features/auth/session";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: "/" });
  },
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <AuthLayout title="Join FitTune" subtitle="Track workouts, runs and progress in one place.">
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary-strong underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
