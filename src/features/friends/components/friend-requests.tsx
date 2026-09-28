import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { refreshFriends } from "../cache";
import { UserAvatar, UserName } from "./user-avatar";
import { account } from "@/api/account";
import { friendRequestsQuery } from "@/api/friends";
import { Button } from "@/components/ui/button";
import { formatAgo } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { FriendRequest } from "@/schemas/friend";

/** Incoming and outgoing requests; renders nothing when there are none */
export function FriendRequests() {
  const query = useQuery(friendRequestsQuery());
  const queryClient = useQueryClient();
  const onSettled = () => refreshFriends(queryClient);
  const accept = useMutation({ mutationFn: account.acceptFriendRequest, onSettled });
  const remove = useMutation({ mutationFn: account.deleteFriendRequest, onSettled });
  const busy = accept.isPending || remove.isPending;

  const { incoming = [], outgoing = [] } = query.data ?? {};
  if (!incoming.length && !outgoing.length) return null;

  return (
    <div className="grid gap-4">
      {incoming.length ? (
        <RequestGroup title={t("Waiting for you")} requests={incoming}>
          {(request) => (
            <>
              <Button size="sm" disabled={busy} onClick={() => accept.mutate(request.user.id)}>{t("Accept")}</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove.mutate(request.user.id)}>{t("Decline")}</Button>
            </>
          )}
        </RequestGroup>
      ) : null}
      {outgoing.length ? (
        <RequestGroup title={t("Sent")} requests={outgoing}>
          {(request) => (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove.mutate(request.user.id)}>{t("Cancel")}</Button>
          )}
        </RequestGroup>
      ) : null}
    </div>
  );
}

function RequestGroup({
  title,
  requests,
  children,
}: {
  title: string;
  requests: FriendRequest[];
  children: (request: FriendRequest) => ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="grid grid-cols-1 gap-2">
        {requests.map((request) => (
          <li key={request.user.id} className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border p-3">
            <UserAvatar user={request.user} />
            <div className="min-w-32 flex-1">
              <UserName user={request.user} />
            </div>
            <span className="text-xs text-muted-foreground">{formatAgo(request.created_at)}</span>
            <div className="flex gap-2">{children(request)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
