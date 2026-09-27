import { Outlet, useRouterState } from "@tanstack/react-router";

import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { ActiveWorkoutBar } from "@/features/workouts/components/active-workout-bar";
import { useWorkoutSync } from "@/features/workouts/use-workout-sync";

export function AppShell() {
  useWorkoutSync();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // The workout screen is the bar's destination and home already shows it inline.
  const hideBar = pathname === "/workout" || pathname === "/";

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] md:px-8 md:pb-12">
        <div className="mx-auto w-full max-w-6xl">
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
