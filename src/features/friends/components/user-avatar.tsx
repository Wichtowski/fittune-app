import { cn } from "@/lib/utils";
import { displayName, type PublicUser } from "@/schemas/friend";

/** Initial of the user's name; the API never exposes profile pictures */
export function UserAvatar({ user, className }: { user: PublicUser; className?: string }) {
  const initial = displayName(user).trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn("flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg font-bold text-secondary-foreground", className)}
    >
      {initial}
    </span>
  );
}

export function UserName({ user }: { user: PublicUser }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-semibold">{displayName(user)}</span>
      <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
    </span>
  );
}
