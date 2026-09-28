import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";

import { appIds, apps } from "../apps";
import { useActiveApp } from "../use-active-app";
import { AppMark } from "./app-mark";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Phone switcher: the current app's mark opens a sheet with both apps */
export function AppSwitcherSheet({ className }: { className?: string }) {
  const active = useActiveApp();
  return (
    <Drawer>
      <DrawerTrigger
        aria-label={t("Switch app")}
        className={cn("shrink-0 rounded-xl transition-transform active:scale-95", className)}
      >
        <AppMark app={active} className="size-9" />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("Switch app")}</DrawerTitle>
        </DrawerHeader>
        <ul className="flex flex-col gap-2 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          {appIds.map((id) => (
            <li key={id} data-app={id}>
              <DrawerClose asChild>
                <Link
                  to={apps[id].home}
                  aria-current={id === active ? "page" : undefined}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-4 aria-[current=page]:border-primary"
                >
                  <AppMark app={id} className="size-11" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold tracking-wide uppercase">{apps[id].name}</span>
                    <span className="block text-sm text-muted-foreground">{t(apps[id].description)}</span>
                  </span>
                  {id === active ? <CheckIcon className="size-5 text-primary-strong" aria-hidden /> : null}
                </Link>
              </DrawerClose>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}
