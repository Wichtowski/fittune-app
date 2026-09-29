import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";

import { appIds, apps } from "../apps";
import { AppMark } from "./app-mark";
import { Logo } from "@/components/layout/logo";
import { t } from "@/lib/i18n";

/** First run only: once an app is used, `/` opens it directly */
export function Launcher() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <Logo />
      <h1 className="font-display text-4xl font-bold tracking-wide uppercase">{t("Where to today?")}</h1>
      <ul className="flex flex-col gap-3">
        {appIds.map((id) => (
          <li key={id} data-app={id}>
            <Link
              to={apps[id].home}
              className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary focus-visible:border-primary"
            >
              <AppMark app={id} className="size-14" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl font-bold tracking-wide uppercase">{apps[id].name}</span>
                <span className="block text-sm text-muted-foreground">{t(apps[id].description)}</span>
              </span>
              <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
