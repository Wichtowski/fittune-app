import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SearchIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { refreshFriends } from "../cache";
import { UserAvatar, UserName } from "./user-avatar";
import { ApiError } from "@/api/client";
import { account } from "@/api/account";
import { lookupUserQuery } from "@/api/friends";
import { queryKeys } from "@/api/query-keys";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { type UsernameSearch, usernameSearchSchema, type UserWithRelationship } from "@/schemas/friend";

/** Exact username search; the API has no directory to browse */
export function FindFriend() {
  const [username, setUsername] = useState<string | null>(null);
  const form = useForm<UsernameSearch>({ resolver: zodResolver(usernameSearchSchema), defaultValues: { username: "" } });
  const lookup = useQuery({ ...lookupUserQuery(username ?? ""), enabled: username !== null });

  return (
    <div className="grid grid-cols-1 gap-3">
      <Form {...form}>
        <form
          className="flex items-end gap-2"
          onSubmit={form.handleSubmit((values) => setUsername(values.username.replace(/^@/, "")))}
          noValidate
        >
          <FormField control={form.control} name="username" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t("Username")}</FormLabel>
              <FormControl>
                <Input autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={t("Their exact username")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" aria-label={t("Find")}>
            <SearchIcon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("Find")}</span>
          </Button>
        </form>
      </Form>

      {username === null ? null : lookup.data ? (
        <SearchResult result={lookup.data} />
      ) : lookup.error instanceof ApiError && lookup.error.status === 404 ? (
        <p role="status" className="text-sm text-muted-foreground">{t("No one uses the username @{username}.", { username })}</p>
      ) : lookup.error ? (
        <QueryError error={lookup.error} onRetry={() => void lookup.refetch()} />
      ) : (
        <Skeleton className="h-16" />
      )}
    </div>
  );
}

function SearchResult({ result }: { result: UserWithRelationship }) {
  const { user, relationship } = result;
  const queryClient = useQueryClient();
  const settle = (message: string) => {
    toast.success(message);
    refreshFriends(queryClient);
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends.lookup(user.username) });
  };
  const onError = (error: Error) => toast.error(t(error.message));
  const send = useMutation({
    mutationFn: () => account.sendFriendRequest(user.username),
    onSuccess: (sent) => settle(sent.relationship === "friends" ? t("You are now friends") : t("Friend request sent")),
    onError,
  });
  const accept = useMutation({
    mutationFn: () => account.acceptFriendRequest(user.id),
    onSuccess: () => settle(t("You are now friends")),
    onError,
  });
  const cancel = useMutation({
    mutationFn: () => account.deleteFriendRequest(user.id),
    onSuccess: () => settle(t("Friend request cancelled")),
    onError,
  });
  const pending = send.isPending || accept.isPending || cancel.isPending;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border p-3">
      <UserAvatar user={user} />
      {/* The action wraps below instead of squeezing the name */}
      <div className="min-w-32 flex-1"><UserName user={user} /></div>
      {relationship === "self" ? (
        <span className="text-sm text-muted-foreground">{t("That's you")}</span>
      ) : relationship === "none" ? (
        <Button size="sm" disabled={pending} onClick={() => send.mutate()}>
          <UserPlusIcon className="size-4" aria-hidden />{t("Add friend")}
        </Button>
      ) : relationship === "incoming" ? (
        <Button size="sm" disabled={pending} onClick={() => accept.mutate()}>{t("Accept")}</Button>
      ) : relationship === "outgoing" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => cancel.mutate()}>{t("Cancel request")}</Button>
      ) : (
        <Button size="sm" variant="secondary" asChild>
          <Link to="/friends/$userId" params={{ userId: user.id }}>{t("View")}</Link>
        </Button>
      )}
    </div>
  );
}
