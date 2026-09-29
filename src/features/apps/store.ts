import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type AppId, isAppId } from "./apps";
import { storage } from "@/lib/storage";

type LastAppState = {
  lastApp: AppId | null;
  setLastApp: (app: AppId) => void;
};

/** The app used last on this device, so starting the PWA opens it again */
export const useLastApp = create<LastAppState>()(
  persist(
    (set) => ({
      lastApp: null,
      setLastApp: (lastApp) => set({ lastApp }),
    }),
    {
      name: "fittune.last-app",
      storage: createJSONStorage(() => storage),
      partialize: ({ lastApp }) => ({ lastApp }),
      // An unknown value from another build means "not chosen yet", not a broken redirect
      merge: (persisted, current) => {
        const lastApp = (persisted as { lastApp?: unknown } | undefined)?.lastApp;
        return { ...current, lastApp: isAppId(lastApp) ? lastApp : null };
      },
    },
  ),
);
