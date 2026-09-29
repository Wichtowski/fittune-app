import type { AppId } from "../apps";
import { cn } from "@/lib/utils";

/**
 * Square app icon. Fixed brand colours (lime from public/favicon.svg, teal for FitHealth) so
 * the marks look the same in both themes
 */
export function AppMark({ app, className }: { app: AppId; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="512" height="512" rx="112" fill="#0f1115" strokeWidth="24" className="dark:stroke-white/15" />
      {app === "train" ? (
        <g fill="#c6f432">
          <rect x="96" y="206" width="44" height="100" rx="14" />
          <rect x="372" y="206" width="44" height="100" rx="14" />
          <rect x="146" y="176" width="44" height="160" rx="14" />
          <rect x="322" y="176" width="44" height="160" rx="14" />
          <rect x="190" y="238" width="132" height="36" rx="10" />
        </g>
      ) : (
        <g fill="none" stroke="#2dd4bf" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
          <path d="M150 362c0-130 80-212 222-212 0 142-82 222-212 222" />
          <path d="M150 362l120-120" />
        </g>
      )}
    </svg>
  );
}
