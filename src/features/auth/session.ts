import { type ParsedLocation, redirect } from "@tanstack/react-router";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { storage } from "@/lib/storage";
import type { AuthResponse } from "@/schemas/user";

type SessionState = {
  token: string | null;
  userId: string | null;
  setSession: (auth: AuthResponse) => void;
  clear: () => void;
};

/** The bearer token lives in app storage (not cookies) so a native shell can reuse it as-is. */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      setSession: ({ session, user }) => set({ token: session.token, userId: user.id }),
      clear: () => set({ token: null, userId: null }),
    }),
    {
      name: "fittune.session",
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: ({ token, userId }) => ({ token, userId }),
    },
  ),
);

export const getToken = () => useSession.getState().token;
export const isAuthenticated = () => getToken() !== null;

/** Sends a signed-out visitor to login, and back to where they were going afterwards */
export function requireAuth(location: ParsedLocation) {
  if (!isAuthenticated()) throw redirect({ to: "/login", search: { redirect: location.href } });
}
