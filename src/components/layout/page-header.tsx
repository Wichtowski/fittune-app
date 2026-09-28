import { useRouterState } from "@tanstack/react-router";
import type * as React from "react";

import { isNavDestination } from "@/features/apps/apps";
import { AppSwitcherSheet } from "@/features/apps/components/app-switcher-sheet";
import { useActiveApp } from "@/features/apps/use-active-app";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
  className?: string;
};

/** Sticky, translucent on phones (like a native nav bar) with the app switcher on top-level screens; a plain heading row on desktop. */
export function PageHeader({ title, eyebrow, actions, back, className }: PageHeaderProps) {
  const app = useActiveApp();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Only top-level screens switch apps, detail screens go back first
  const switcher = isNavDestination(app, pathname) ? <AppSwitcherSheet className="md:hidden" /> : null;
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 flex items-end justify-between gap-3 bg-background/85 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-xl md:static md:mx-0 md:bg-transparent md:px-0 md:pt-8 md:pb-6 md:backdrop-blur-none",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {switcher}
        {back}
        <div className="min-w-0">
          {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
          <h1 className="truncate font-display text-3xl font-bold tracking-wide uppercase md:text-4xl">{title}</h1>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
