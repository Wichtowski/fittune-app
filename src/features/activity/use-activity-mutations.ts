import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { mutationKeys, type SaveActivityVariables } from "@/api/mutation-defaults";
import { queryKeys } from "@/api/query-keys";
import type { Activity } from "@/schemas/activity";
import type { Page } from "@/schemas/common";

type ActivityPages = InfiniteData<Page<Activity>>;

/** Applies `fn` to every cached activity list (all kinds) and returns a rollback snapshot. */
function useListUpdater() {
  const queryClient = useQueryClient();
  return async (fn: (items: Activity[], kind: string) => Activity[]) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.activities.all });
    const snapshot = queryClient.getQueriesData<ActivityPages>({ queryKey: ["activities", "list"] });
    for (const [key, data] of snapshot) {
      if (!data) continue;
      const kind = String(key[2] ?? "all");
      const items = fn(data.pages.flatMap((page) => page.items), kind);
      // Lists render the flattened pages, so the edited items can all live in the first page
      // until the refetch after the mutation settles; page cursors are left untouched.
      queryClient.setQueryData<ActivityPages>(key, {
        ...data,
        pages: data.pages.map((page, i) => ({ ...page, items: i === 0 ? items : [] })),
      });
    }
    return () => snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
  };
}

/** Create or edit an activity; the list updates instantly and rolls back on failure. */
export function useSaveActivity() {
  const queryClient = useQueryClient();
  const updateLists = useListUpdater();

  return useMutation({
    mutationKey: mutationKeys.saveActivity,
    onMutate: async ({ id, input }: SaveActivityVariables) => {
      const now = new Date().toISOString();
      const optimistic: Activity = { ...input, id, created_at: now, updated_at: now };
      const rollback = await updateLists((items, kind) => {
        const others = items.filter((a) => a.id !== id);
        if (kind !== "all" && kind !== input.kind) return others;
        return [...others, optimistic].sort((a, b) => b.started_at.localeCompare(a.started_at));
      });
      return { rollback };
    },
    onError: (_error, _vars, context) => {
      context?.rollback();
      toast.error("Couldn't save the activity.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  const updateLists = useListUpdater();

  return useMutation({
    mutationKey: mutationKeys.deleteActivity,
    onMutate: async (id: string) => ({ rollback: await updateLists((items) => items.filter((a) => a.id !== id)) }),
    onError: (_error, _id, context) => {
      context?.rollback();
      toast.error("Couldn't delete the activity.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}
