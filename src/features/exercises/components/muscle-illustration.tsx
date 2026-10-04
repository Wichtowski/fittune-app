import { getLocale, t } from "@/lib/i18n";
import { engagement, type TrainableMuscle, type ViewName } from "../anatomy";
import { MuscleBody, MuscleMapCredit, type MuscleStyles } from "./muscle-body";
import { Button } from "@/components/ui/button";
import { muscleLabels } from "@/lib/labels";
import { MUSCLES, type Muscle } from "@/schemas/common";

type MuscleIllustrationProps = {
  muscle: Muscle;
  secondaryMuscles?: readonly Muscle[];
  // Compact draws only the view that shows the most of the primary muscle, for thumbnails
  compact?: boolean;
  className?: string;
};

const regionColors = {
  primary: "fill-muscle-load-high",
  secondary: "fill-muscle-load-low",
  inactive: "fill-anatomy-muscle",
};

const focusView: Record<TrainableMuscle, ViewName> = {
  chest: "front", lats: "back", upper_back: "back", lower_back: "back", traps: "back",
  shoulders: "front", biceps: "front", triceps: "back", forearms: "front", abs: "front",
  quadriceps: "front", hamstrings: "back", glutes: "back", calves: "back",
};

export function MuscleIllustration({ muscle, secondaryMuscles = [], compact = false, className = "" }: MuscleIllustrationProps) {
  const secondary = [...new Set(secondaryMuscles)].filter((m) => m !== muscle);
  const label = t("{muscle} bodypart illustration{secondary}", {
    muscle: getLocale() === "en" ? muscle.replaceAll("_", " ") : t(muscleLabels[muscle]),
    secondary: secondary.length ? t("; secondary: {muscles}", { muscles: secondary.map((m) => t(muscleLabels[m])).join(", ") }) : "",
  });
  const muscles: MuscleStyles = {};
  for (const group of MUSCLES) {
    if (group === "full_body" || group === "cardio") continue;
    const state = engagement(group, muscle, secondary);
    muscles[group] = { className: regionColors[state], engagement: state };
  }
  return (
    <MuscleBody muscles={muscles} label={label} description={t("Primary muscles are red. Secondary muscles are green. Other regions are grey.")} compactView={compact ? muscle === "full_body" || muscle === "cardio" ? "front" : focusView[muscle] : undefined} className={className} />
  );
}

export function MuscleMap({ muscle, secondaryMuscles = [], onView3D }: Pick<MuscleIllustrationProps, "muscle" | "secondaryMuscles"> & { onView3D?: () => void }) {
  const secondary = [...new Set(secondaryMuscles)].filter((m) => m !== muscle && muscle !== "full_body");

  return (
    <figure aria-label={t("Muscles worked")} className="rounded-xl border bg-muted/20 p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="font-semibold">{t("Muscles worked")}</span>
        {onView3D ? <Button type="button" variant="secondary" size="sm" onClick={onView3D}>{t("View in 3D")}</Button> : <span className="text-xs text-muted-foreground">{t("Front & back")}</span>}
      </figcaption>
      <MuscleIllustration muscle={muscle} secondaryMuscles={secondary} className="mx-auto w-full max-w-80" />
      <dl className="mt-4 grid gap-2 border-t pt-3 text-xs">
        <div className="flex gap-2">
          <dt className="flex shrink-0 items-start gap-2 text-muted-foreground"><span aria-hidden className="mt-0.5 size-2.5 rounded-full bg-muscle-load-high" />{t("Primary")}</dt>
          <dd className="font-medium">{t(muscleLabels[muscle])}</dd>
        </div>
        {secondary.length ? (
          <div className="flex gap-2">
            <dt className="flex shrink-0 items-start gap-2 text-muted-foreground"><span aria-hidden className="mt-0.5 size-2.5 rounded-full bg-muscle-load-low" />{t("Secondary")}</dt>
            <dd className="font-medium">{secondary.map((m) => t(muscleLabels[m])).join(", ")}</dd>
          </div>
        ) : null}
      </dl>
      {muscle === "cardio" ? <p className="mt-3 text-xs text-muted-foreground">{t("Cardio describes the activity, not a specific muscle group.")}</p> : null}
      <MuscleMapCredit />
    </figure>
  );
}
