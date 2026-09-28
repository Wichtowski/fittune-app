import { Outlet, useRouterState } from "@tanstack/react-router";

import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { useRouteApp } from "@/features/apps/use-active-app";
import { ConnectionBanner } from "@/features/offline/components/connection-banner";
import { useAutoOfflineSync } from "@/features/offline/use-offline-sync";
import { ActiveWorkoutBar } from "@/features/workouts/components/active-workout-bar";
import { useWorkoutSync } from "@/features/workouts/use-workout-sync";

export function AppShell() {
  useWorkoutSync();
  useAutoOfflineSync();
  const routeApp = useRouteApp();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // The workout screen is the bar's destination and home already shows it inline.
  const hideBar = pathname === "/workout" || pathname === "/train";

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] md:px-8 md:pb-12">
        <div className="mx-auto w-full max-w-6xl">
          {routeApp === "health" ? null : <ConnectionBanner className="mt-4 md:mt-6" />}
          <Outlet />
        </div>
      </main>
      {hideBar ? null : (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 md:hidden">
          <ActiveWorkoutBar />
        </div>
      )}
      <BottomNav />
    </div>
  );
}
