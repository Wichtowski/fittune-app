import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-2xl font-bold tracking-wide uppercase", className)}>
      <svg viewBox="0 0 512 512" aria-hidden className="size-8">
        {/* Fixed brand colours from public/favicon.svg so the mark looks the same in both themes */}
        <rect width="512" height="512" rx="112" fill="#0f1115" strokeWidth="24" className="dark:stroke-white/15" />
        <g fill="#c6f432">
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
