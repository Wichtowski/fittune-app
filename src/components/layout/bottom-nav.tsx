import { t } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";

import { mobileNav } from "./nav-items";
import { useWorkoutStore } from "@/features/workouts/store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const hasActive = useWorkoutStore((state) => state.active !== null);

  return (
    <nav
      aria-label={t("Primary")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {mobileNav.map(({ to, label, icon: Icon, exact }) => {
          const isWorkout = to === "/workout";
          return (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: exact ?? false }}
                className="group flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold text-muted-foreground data-[status=active]:text-foreground"
              >
                {isWorkout ? (
                  <span
                    className={cn(
                      "-mt-5 flex size-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-active:scale-95",
                      hasActive && "animate-pulse-ring",
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                  </span>
                ) : (
                  <Icon className="size-6 transition-transform group-active:scale-90" aria-hidden />
                )}
                <span>{isWorkout && hasActive ? t("Resume") : t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
