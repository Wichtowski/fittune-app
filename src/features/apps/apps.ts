import {
  ActivityIcon,
  BookOpenIcon,
  ChartNoAxesColumnIcon,
  ClipboardListIcon,
  DumbbellIcon,
  HistoryIcon,
  HouseIcon,
  type LucideIcon,
  NotebookPenIcon,
  TargetIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import type { FileRoutesByTo } from "@/routeTree.gen";

export type AppId = "train" | "health";

export type NavItem = { to: keyof FileRoutesByTo; label: string; icon: LucideIcon; exact?: boolean };
export type NavGroup = { heading: string; items: NavItem[] };

export type AppDefinition = {
  id: AppId;
  /** Brand name, never translated */
  name: string;
  home: "/train" | "/health";
  /** One line for the launcher, translated at render */
  description: string;
  /** Phone: a few thumb-reachable destinations */
  mobileNav: NavItem[];
  /** Desktop: every area, grouped */
  desktopNav: NavGroup[];
  /** The big button at the top of the desktop sidebar */
  primaryAction: "start-workout" | null;
};

export const apps: Record<AppId, AppDefinition> = {
  train: {
    id: "train",
    name: "FitTune",
    home: "/train",
    description: "Training: workouts, routines, progress",
    mobileNav: [
      { to: "/train", label: "Home", icon: HouseIcon, exact: true },
      { to: "/activity", label: "Activity", icon: ActivityIcon },
      { to: "/workout", label: "Workout", icon: DumbbellIcon },
      { to: "/progress", label: "Progress", icon: ChartNoAxesColumnIcon },
      { to: "/profile", label: "Profile", icon: UserRoundIcon },
    ],
    desktopNav: [
      {
        heading: "Train",
        items: [
          { to: "/train", label: "Dashboard", icon: HouseIcon, exact: true },
          { to: "/workout", label: "Workout", icon: DumbbellIcon },
          { to: "/activity", label: "Activity", icon: ActivityIcon },
        ],
      },
      {
        heading: "Analyse",
        items: [
          { to: "/progress", label: "Progress", icon: ChartNoAxesColumnIcon },
          { to: "/workouts", label: "History", icon: HistoryIcon },
        ],
      },
      {
        heading: "Plan",
        items: [
          { to: "/routines", label: "Routines", icon: ClipboardListIcon },
          { to: "/exercises", label: "Exercises", icon: BookOpenIcon },
        ],
      },
      { heading: "Together", items: [{ to: "/friends", label: "Friends", icon: UsersIcon }] },
    ],
    primaryAction: "start-workout",
  },
  health: {
    id: "health",
    name: "FitHealth",
    home: "/health",
    description: "Nutrition: food diary and product scanning",
    mobileNav: [
      { to: "/health", label: "Diary", icon: NotebookPenIcon, exact: true },
      { to: "/health/goals", label: "Goals", icon: TargetIcon },
      { to: "/profile", label: "Profile", icon: UserRoundIcon },
    ],
    desktopNav: [
      {
        heading: "Nutrition",
        items: [
          { to: "/health", label: "Diary", icon: NotebookPenIcon, exact: true },
          { to: "/health/goals", label: "Goals", icon: TargetIcon },
        ],
      },
    ],
    primaryAction: null,
  },
};

export const appIds: readonly AppId[] = ["train", "health"];

/** Guards values read from storage, an older build may have written something else */
export function isAppId(value: unknown): value is AppId {
  return typeof value === "string" && (appIds as readonly string[]).includes(value);
}

/** Top-level screens of an app: the ones its navigation links to, where the mobile switcher shows */
export function isNavDestination(app: AppId, pathname: string): boolean {
  const { mobileNav, desktopNav } = apps[app];
  return [...mobileNav, ...desktopNav.flatMap((group) => group.items)].some((item) => item.to === pathname);
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** The app a page belongs to. Shared pages leave it out and stay in the current app */
    app?: AppId;
  }
}
