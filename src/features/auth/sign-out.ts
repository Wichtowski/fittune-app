import { useSession } from "./session";
import { account } from "@/api/account";
import { queryKeys } from "@/api/query-keys";
import { useConnectivity } from "@/lib/connectivity";
import { QUERY_CACHE_KEY, queryClient } from "@/lib/query-client";
import { storage } from "@/lib/storage";
import { stopOfflineSync } from "@/features/offline/use-offline-sync";
import { useWorkoutStore } from "@/features/workouts/store";
import type { AuthResponse } from "@/schemas/user";

/**
 * Forgets the session and cached server data on this device. Local workouts are kept unless
 * `discardWorkouts` is set: an expired token must not cost an unsynced session, and they stay
 * tied to their owner so signing in as someone else resets them (see `onSignedIn`).
 */
export function clearLocalSession({ discardWorkouts = false } = {}) {
  useSession.getState().clear();
  if (discardWorkouts) useWorkoutStore.getState().reset();
  // An offline sync still running must not write this user's data back after the clear
  stopOfflineSync();
  void queryClient.cancelQueries();
  queryClient.clear();
  storage.removeItem(QUERY_CACHE_KEY);
  // Offline mode would keep the next sign-in waiting for a network it is told not to use
  useConnectivity.getState().setManualOffline(false);
}

/** Explicit sign-out: revokes the token and removes all of this user's local data. */
export async function signOut() {
  try {
    await account.logout();
  } catch {
    // Offline or already expired: the local session is cleared either way.
  }
  clearLocalSession({ discardWorkouts: true });
}

export function onSignedIn(auth: AuthResponse) {
  const { ownerId, reset } = useWorkoutStore.getState();
  if (ownerId && ownerId !== auth.user.id) reset();
  useSession.getState().setSession(auth);
  queryClient.setQueryData(queryKeys.me, auth.user);
}
