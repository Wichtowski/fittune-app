import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { account } from "@/api/account";
import { sharingQuery } from "@/api/friends";
import { queryKeys } from "@/api/query-keys";
import { QueryFallback } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import type { Sharing } from "@/schemas/friend";

const options: { key: keyof Sharing; label: string; description: string }[] = [
  { key: "workouts", label: "Workouts", description: "Finished workouts: title, exercises, sets and volume. Never notes or places." },
  { key: "activities", label: "Activities", description: "Runs, rides and other sessions: distance and time. Never notes or heart rate." },
  { key: "stats", label: "Stats", description: "Totals and your weekly streak." },
  { key: "personal_records", label: "Personal records", description: "Your best lifts and efforts per exercise." },
];

/** What friends can see. Each change saves on its own */
export function SharingSettings() {
  const query = useQuery(sharingQuery());
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: account.updateSharing,
    // Each save sends every setting, so quick toggles must reach the server in order
    scope: { id: "friend-sharing" },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.friends.sharing });
      const previous = queryClient.getQueryData<Sharing>(queryKeys.friends.sharing);
      queryClient.setQueryData(queryKeys.friends.sharing, next);
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.friends.sharing, context.previous);
      toast.error(t("Couldn't save your sharing settings. Try again."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.friends.sharing }),
  });

  const sharing = query.data;
  if (!sharing) {
    return (
      <QueryFallback query={query}>
        <Skeleton className="h-48" />
      </QueryFallback>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <p className="text-sm text-muted-foreground">{t("Choose what your friends can see. Nothing is shared until you turn it on, and progress photos are never shared.")}</p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-checked:border-primary has-checked:bg-primary/10"
          >
            <input
              type="checkbox"
              checked={sharing[option.key]}
              disabled={save.isPending}
              onChange={(event) => save.mutate({ ...sharing, [option.key]: event.target.checked })}
              className="mt-0.5 size-4 accent-primary"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{t(option.label)}</span>
              <span className="text-xs text-muted-foreground">{t(option.description)}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
