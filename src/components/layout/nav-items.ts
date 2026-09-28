import {
  ActivityIcon,
  BookOpenIcon,
  ChartNoAxesColumnIcon,
  ClipboardListIcon,
  DumbbellIcon,
  HistoryIcon,
  HouseIcon,
  type LucideIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import type { FileRoutesByTo } from "@/routeTree.gen";

export type NavItem = { to: keyof FileRoutesByTo; label: string; icon: LucideIcon; exact?: boolean };

/** Phone: five thumb-reachable destinations focused on doing the training. */
export const mobileNav: NavItem[] = [
  { to: "/train", label: "Home", icon: HouseIcon, exact: true },
  { to: "/activity", label: "Activity", icon: ActivityIcon },
  { to: "/workout", label: "Workout", icon: DumbbellIcon },
  { to: "/progress", label: "Progress", icon: ChartNoAxesColumnIcon },
  { to: "/profile", label: "Profile", icon: UserRoundIcon },
];

/** Desktop: every area, with analysis and planning surfaced directly. */
export const desktopNav: { heading: string; items: NavItem[] }[] = [
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
  {
    heading: "Together",
    items: [{ to: "/friends", label: "Friends", icon: UsersIcon }],
  },
];
