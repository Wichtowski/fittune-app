import { Link } from "@tanstack/react-router";

import { appIds, apps } from "../apps";
import { useActiveApp } from "../use-active-app";
import { AppMark } from "./app-mark";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Desktop switcher: both apps side by side, one click away */
export function AppSegmentedSwitch({ className }: { className?: string }) {
  const active = useActiveApp();
  return (
    <nav aria-label={t("Switch app")} className={cn("grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1", className)}>
      {appIds.map((id) => (
        <Link
          key={id}
          to={apps[id].home}
          aria-current={id === active ? "page" : undefined}
          className={cn(
            "flex h-11 items-center justify-center gap-1.5 rounded-xl font-display text-base font-bold tracking-wide uppercase text-muted-foreground transition-colors hover:text-foreground",
            id === active && "bg-card text-foreground shadow-sm",
          )}
        >
          <AppMark app={id} className="size-5" />
          {apps[id].name}
        </Link>
      ))}
    </nav>
  );
}
