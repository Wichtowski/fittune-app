import { Link } from "@tanstack/react-router";
import { BookOpenIcon, ChevronRightIcon } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The way to the exercise library on a phone, whose bottom bar has no room for it */
export function BrowseExercisesLink({ className }: { className?: string }) {
  return (
    <Link to="/exercises" className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/60", className)}>
      <BookOpenIcon className="size-6 shrink-0 text-primary-strong" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t("Browse exercises")}</span>
        <span className="block text-sm text-muted-foreground">{t("See how each one is done, or add your own")}</span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
