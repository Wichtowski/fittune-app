import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { refreshFriends } from "../cache";
import { UserAvatar, UserName } from "./user-avatar";
import { account } from "@/api/account";
import { blocksQuery } from "@/api/friends";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/** Renders nothing until someone is blocked */
export function BlockedUsers() {
  const query = useQuery(blocksQuery());
  const queryClient = useQueryClient();
  const unblock = useMutation({
    mutationFn: account.unblockUser,
    onSuccess: () => toast.success(t("User unblocked")),
    onError: (error) => toast.error(t(error.message)),
    onSettled: () => refreshFriends(queryClient),
  });

  if (!query.data?.length) return null;
  return (
    <section className="grid grid-cols-1 gap-2">
      <h2 className="font-display text-xl font-bold tracking-wide uppercase">{t("Blocked")}</h2>
      <p className="text-sm text-muted-foreground">{t("Blocked users can't find you or send you requests. Unblocking doesn't make you friends again.")}</p>
      <ul className="grid grid-cols-1 gap-2">
        {query.data.map(({ user }) => (
          <li key={user.id} className="flex items-center gap-3 rounded-2xl border p-3">
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1"><UserName user={user} /></div>
            <Button size="sm" variant="ghost" disabled={unblock.isPending} onClick={() => unblock.mutate(user.id)}>{t("Unblock")}</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
