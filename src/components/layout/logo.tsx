import { apps, type AppId } from "@/features/apps/apps";
import { AppMark } from "@/features/apps/components/app-mark";
import { cn } from "@/lib/utils";

export function Logo({ app = "train", className }: { app?: AppId; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-2xl font-bold tracking-wide uppercase", className)}>
      <AppMark app={app} />
      {apps[app].name}
    </span>
  );
}
