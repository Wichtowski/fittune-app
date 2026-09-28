export type AppId = "train" | "health";

export type AppDefinition = {
  id: AppId;
  /** Brand name, never translated */
  name: string;
  home: "/train" | "/health";
  /** One line for the launcher, translated at render */
  description: string;
};

export const apps: Record<AppId, AppDefinition> = {
  train: {
    id: "train",
    name: "FitTune",
    home: "/train",
    description: "Training: workouts, routines, progress",
  },
  health: {
    id: "health",
    name: "FitHealth",
    home: "/health",
    description: "Nutrition: food diary and product scanning",
  },
};

export const appIds: readonly AppId[] = ["train", "health"];

/** Guards values read from storage, an older build may have written something else */
export function isAppId(value: unknown): value is AppId {
  return typeof value === "string" && (appIds as readonly string[]).includes(value);
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** The app a page belongs to. Shared pages leave it out and stay in the current app */
    app?: AppId;
  }
}
