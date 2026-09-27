import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-2xl font-bold tracking-wide uppercase", className)}>
      <svg viewBox="0 0 512 512" aria-hidden className="size-8">
        <rect width="512" height="512" rx="112" className="fill-foreground" />
        <g className="fill-primary">
          <rect x="96" y="206" width="44" height="100" rx="14" />
          <rect x="372" y="206" width="44" height="100" rx="14" />
          <rect x="146" y="176" width="44" height="160" rx="14" />
          <rect x="322" y="176" width="44" height="160" rx="14" />
          <rect x="190" y="238" width="132" height="36" rx="10" />
        </g>
      </svg>
      FitTune
    </span>
  );
}
