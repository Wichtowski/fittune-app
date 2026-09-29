import type { QueryClient } from "@tanstack/react-query";

import { fittune } from "./fittune";
import type { ActivityInput } from "@/schemas/activity";

export const mutationKeys = {
  saveActivity: ["activities", "save"] as const,
  deleteActivity: ["activities", "delete"] as const,
};

export type SaveActivityVariables = { id: string; input: ActivityInput };

/**
 * Mutation functions registered by key, so writes paused while offline survive a reload:
 * the persister stores them and `resumePausedMutations` replays them once restored.
 */
export function registerMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults(mutationKeys.saveActivity, {
    mutationFn: ({ id, input }: SaveActivityVariables) => fittune.putActivity(id, input),
  });
  queryClient.setMutationDefaults(mutationKeys.deleteActivity, {
    mutationFn: (id: string) => fittune.deleteActivity(id),
  });
}
