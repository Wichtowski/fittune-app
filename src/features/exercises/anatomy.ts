import type { Muscle } from "@/schemas/common";

export type TrainableMuscle = Exclude<Muscle, "full_body" | "cardio">;
export type ViewName = "front" | "back";

export type AnatomyRegion = {
  name: string;
  kind: "bone" | "muscle";
  // Muscles outside the FitTune groups stay null and are drawn neutral
  muscle: TrainableMuscle | null;
  d: string;
};

export type AnatomyView = {
  silhouette: string;
  regions: readonly AnatomyRegion[];
};

export type Engagement = "primary" | "secondary" | "inactive";

export function engagement(group: Muscle | null, primary: Muscle, secondary: readonly Muscle[]): Engagement {
  if (primary === "full_body" || group === primary) return "primary";
  if (secondary.includes("full_body") || (group && secondary.includes(group))) return "secondary";
  return "inactive";
}

export { anatomyViewBox, anatomyViews, focusView } from "./anatomy.generated";
