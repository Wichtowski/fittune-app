import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, UsersIcon } from "lucide-react";

import { UserAvatar, UserName } from "./user-avatar";
import { friendsQuery } from "@/api/friends";
import { EmptyState } from "@/components/empty-state";
import { QueryFallback } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export function FriendList() {
  const query = useQuery(friendsQuery());
  if (!query.data) {
    return (
      <QueryFallback query={query}>
        <Skeleton className="h-16" />
      </QueryFallback>
    );
  }
  if (!query.data.length) {
    return <EmptyState icon={UsersIcon} title={t("No friends yet")} description={t("Find someone by their exact username to send a request.")} />;
  }

  return (
    <ul className="grid grid-cols-1 gap-2">
      {query.data.map((friend) => (
        <li key={friend.user.id}>
          <Link
            to="/friends/$userId"
            params={{ userId: friend.user.id }}
            className="flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-accent/60"
          >
            <UserAvatar user={friend.user} />
            <div className="min-w-0 flex-1"><UserName user={friend.user} /></div>
            <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
