import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";

import { UpdatePrompt } from "@/components/layout/update-prompt";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
      <UpdatePrompt />
    </>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-7xl font-bold text-primary-strong">404</p>
      <p className="text-muted-foreground">This page skipped leg day and never showed up.</p>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
