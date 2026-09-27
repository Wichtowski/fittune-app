import { BikeIcon, FootprintsIcon, type LucideIcon, MountainIcon, ShipWheelIcon, TimerIcon, WavesIcon, ZapIcon } from "lucide-react";

import { formatPace, formatSpeed } from "@/lib/units";
import type { ActivityKind, DistanceUnit } from "@/schemas/common";

export const activityIcons: Record<ActivityKind, LucideIcon> = {
  run: ZapIcon,
  ride: BikeIcon,
  walk: FootprintsIcon,
  hike: MountainIcon,
  swim: WavesIcon,
  row: ShipWheelIcon,
  other: TimerIcon,
};

/** Runners think in pace, cyclists and rowers in speed. */
export function activityRate(kind: ActivityKind, seconds: number, metres: number | null, unit: DistanceUnit) {
  return kind === "ride" || kind === "row" ? formatSpeed(seconds, metres, unit) : formatPace(seconds, metres, unit);
}
