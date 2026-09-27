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

export { anatomyViewBox, anatomyViews, focusView } from "./anatomy.generated";
