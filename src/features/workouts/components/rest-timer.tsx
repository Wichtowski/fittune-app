import { MinusIcon, PlusIcon, TimerIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useWorkoutStore } from "../store";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { formatClock } from "@/lib/format";

/** Floating countdown shown after completing a set. Time is derived from `endsAt`, so it
 * survives reloads and backgrounding without drifting. */
export function RestTimer() {
  const rest = useWorkoutStore((state) => state.rest);
  const adjustRest = useWorkoutStore((state) => state.adjustRest);
  const clearRest = useWorkoutStore((state) => state.clearRest);
  const now = useNow(250, rest !== null);
  const notified = useRef<number | null>(null);

  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!rest || remaining > 0 || notified.current === rest.endsAt) return;
    notified.current = rest.endsAt;
    navigator.vibrate?.([200, 100, 200]);
    toast("Rest over — next set!", { icon: <TimerIcon className="size-4" aria-hidden />, duration: 3000 });
    clearRest();
  }, [rest, remaining, clearRest]);

  if (!rest || remaining <= 0) return null;
  const progress = Math.min(1, Math.max(0, 1 - remaining / rest.total));

  return (
    <div
      role="timer"
      aria-label={`Rest ${formatClock(remaining)} remaining`}
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 overflow-hidden rounded-2xl border border-primary/30 bg-card/95 shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-8 md:bottom-8 md:w-96"
    >
      <div className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      <div className="relative flex items-center gap-2 p-2 pl-4">
        <div className="flex-1">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Rest</p>
          <p className="font-display text-3xl leading-none font-bold tabular">{formatClock(remaining)}</p>
        </div>
        <Button variant="secondary" size="icon" onClick={() => adjustRest(-15)} aria-label="15 seconds less">
          <MinusIcon aria-hidden />
        </Button>
        <Button variant="secondary" size="icon" onClick={() => adjustRest(15)} aria-label="15 seconds more">
          <PlusIcon aria-hidden />
        </Button>
        <Button variant="default" size="icon" onClick={clearRest} aria-label="Skip rest">
          <XIcon aria-hidden />
        </Button>
      </div>
    </div>
  );
}
