import { t } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PlayIcon } from "lucide-react";

import { Logo } from "./logo";
import { desktopNav } from "./nav-items";
import { meQuery } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { ActiveWorkoutBar } from "@/features/workouts/components/active-workout-bar";
import { SyncIndicator } from "@/features/workouts/components/sync-indicator";
import { useWorkoutStore } from "@/features/workouts/store";

export function Sidebar() {
  const { data: me } = useQuery(meQuery());
  const hasActive = useWorkoutStore((state) => state.active !== null);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-card/40 px-4 py-6 md:flex">
      <Link to="/" className="px-2">
        <Logo />
      </Link>

      {hasActive ? (
        <ActiveWorkoutBar />
      ) : (
        <Button asChild size="lg" className="w-full">
          <Link to="/workout">
            <PlayIcon className="fill-current" aria-hidden />{" "}{t("Start workout")}{" "}</Link>
        </Button>
      )}

      <nav aria-label={t("Primary")} className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {desktopNav.map((group) => (
          <div key={group.heading} className="flex flex-col gap-1">
            <p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
              {t(group.heading)}
            </p>
            {group.items.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: exact ?? false }}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary/12 data-[status=active]:text-foreground [&[data-status=active]_svg]:text-primary-strong"
              >
                <Icon className="size-5" aria-hidden />
                {t(label)}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t pt-4">
        <SyncIndicator className="px-2" />
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent data-[status=active]:bg-accent"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold uppercase">
            {(me?.display_name ?? me?.username ?? "?").slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{me?.display_name ?? me?.username ?? t("Profile")}</span>
            <span className="block truncate text-xs text-muted-foreground">{t("Profile & settings")}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
