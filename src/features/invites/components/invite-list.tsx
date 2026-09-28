import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { account } from "@/api/account";
import { invitesQuery } from "@/api/invites";
import { queryKeys } from "@/api/query-keys";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Invite } from "@/schemas/invite";

const statusBadge: Record<Invite["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Active", variant: "default" },
  used: { label: "Used", variant: "secondary" },
  expired: { label: "Expired", variant: "outline" },
  revoked: { label: "Revoked", variant: "destructive" },
};

export function InviteList() {
  const query = useQuery(invitesQuery());
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<string | null>(null);
  const revoke = useMutation({
    mutationFn: account.revokeInvite,
    onSuccess: () => {
      setConfirming(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.invites });
      toast.success(t("Invite revoked"));
    },
    onError: () => toast.error(t("Couldn't revoke the invite. Try again.")),
  });

  if (query.error && !query.data) return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <Skeleton className="h-24" />;
  if (!query.data.length) return <p className="text-sm text-muted-foreground">{t("No invites yet.")}</p>;

  return (
    <ul className="grid gap-2">
      {query.data.map((invite) => {
        const badge = statusBadge[invite.status];
        return (
          <li key={invite.id} className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{invite.note ?? t("No note")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("{used}/{total} used", { used: invite.use_count, total: invite.max_uses })} · {t(invite.status === "expired" ? "expired" : "expires")} {formatDate(invite.expires_at)}
                  {invite.created_by ? ` · ${t("by {name}", { name: invite.created_by })}` : ""}
                </p>
              </div>
              <Badge variant={badge.variant}>{t(badge.label)}</Badge>
            </div>
            {invite.status === "active" ? (
              confirming === invite.id ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">{t("Revoke? The code stops working; accounts already created stay.")}</p>
                  <Button size="sm" variant="destructive" disabled={revoke.isPending} onClick={() => revoke.mutate(invite.id)}>{t("Revoke")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>{t("Cancel")}</Button>
                </div>
              ) : (
                <Button className="mt-2" size="sm" variant="ghost" onClick={() => setConfirming(invite.id)}>{t("Revoke")}</Button>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
