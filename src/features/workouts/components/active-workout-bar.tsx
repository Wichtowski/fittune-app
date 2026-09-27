import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, TimerIcon } from "lucide-react";

import { totals } from "../draft";
import { useWorkoutStore } from "../store";
import { useNow } from "@/hooks/use-now";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "Now playing"-style strip that keeps an in-progress workout one tap away. */
export function ActiveWorkoutBar({ className }: { className?: string }) {
  const active = useWorkoutStore((state) => state.active);
  const rest = useWorkoutStore((state) => state.rest);
  const now = useNow(1000, active !== null);
  if (!active) return null;

  const elapsed = (now - new Date(active.started_at).getTime()) / 1000;
  const restLeft = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;
  const { completedSets, totalSets } = totals(active);

  return (
    <Link
      to="/workout"
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-xl",
        className,
      )}
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{active.title}</p>
        <p className="text-xs text-muted-foreground tabular">
          {formatClock(elapsed)} · {completedSets}/{totalSets} sets
        </p>
      </div>
      {restLeft > 0 ? (
        <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-display text-lg leading-none font-bold text-primary-foreground tabular">
          <TimerIcon className="size-4" aria-hidden />
          {formatClock(restLeft)}
        </span>
      ) : null}
      <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden />
    </Link>
  );
}
