import { MuscleBody, MuscleMapCredit, type MuscleStyles } from "@/features/exercises/components/muscle-body";
import { MUSCLES } from "@/schemas/common";
import type { MuscleVolume } from "@/schemas/stats";
import { t } from "@/lib/i18n";

const colors = ["fill-anatomy-muscle", "fill-muscle-load-low", "fill-muscle-load-medium", "fill-muscle-load-high"] as const;

export function MuscleVolumeMap({ rows }: { rows: readonly MuscleVolume[] }) {
  const fullBody = rows.find((row) => row.muscle === "full_body")?.sets ?? 0;
  const muscles: MuscleStyles = {};
  const maximum = Math.max(0, ...MUSCLES.filter((muscle) => muscle !== "full_body" && muscle !== "cardio").map((muscle) => (rows.find((row) => row.muscle === muscle)?.sets ?? 0) + fullBody));
  for (const muscle of MUSCLES) {
    if (muscle === "full_body" || muscle === "cardio") continue;
    const sets = (rows.find((row) => row.muscle === muscle)?.sets ?? 0) + fullBody;
    const level = sets === 0 ? 0 : sets / maximum >= 0.75 ? 3 : sets / maximum >= 0.4 ? 2 : 1;
    muscles[muscle] = { className: colors[level], sets };
  }
  return (
    <div>
      <MuscleBody muscles={muscles} label={t("Training volume by muscle")} description={t("Colour shows working sets relative to your most trained muscle in this period. It does not measure recovery.")} className="mx-auto w-full max-w-80" />
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-label={t("Working sets: fewer to more")}>
        <span>{t("Fewer sets")}</span>
        <span aria-hidden className="size-3 rounded bg-anatomy-muscle" />
        <span aria-hidden className="size-3 rounded bg-muscle-load-low" />
        <span aria-hidden className="size-3 rounded bg-muscle-load-medium" />
        <span aria-hidden className="size-3 rounded bg-muscle-load-high" />
        <span>{t("More sets")}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("Primary-muscle sets only. Full-body sets count for every group; secondary effort is not estimated.")}</p>
      <MuscleMapCredit />
    </div>
  );
}
