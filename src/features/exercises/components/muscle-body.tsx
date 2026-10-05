import { bodyViews } from "../body-shapes.generated";
import type { Engagement, TrainableMuscle, ViewName } from "../anatomy";
import { t } from "@/lib/i18n";
import { muscleLabels } from "@/lib/labels";

export type MuscleStyle = { className: string; engagement?: Engagement; sets?: number };
export type MuscleStyles = Partial<Record<TrainableMuscle, MuscleStyle>>;

const GAP = 80;
const LABEL_SPACE = 60;

function BodyView({ view, muscles, compact }: { view: ViewName; muscles: MuscleStyles; compact: boolean }) {
  const geometry = bodyViews[view];
  return (
    <g transform={`translate(${-geometry.x} ${-geometry.y})`} stroke="var(--background)" strokeWidth="2" strokeLinejoin="round">
      {compact ? <path d={geometry.regions.flatMap((region) => region.paths).join(" ")} className="fill-anatomy-muscle" /> : null}
      {geometry.regions.map((region) => {
        const style = region.muscle ? muscles[region.muscle] : undefined;
        if (compact && (!style || style.engagement === "inactive")) return null;
        return (
          <path
            key={region.name}
            d={region.paths.join(" ")}
            data-kind={region.muscle ? "muscle" : "neutral"}
            data-muscle={region.muscle ?? undefined}
            data-engagement={style?.engagement}
            data-sets={style?.sets}
            className={style?.className ?? "fill-anatomy-muscle"}
          >
            {region.muscle ? <title>{t(muscleLabels[region.muscle])}{style?.sets !== undefined ? `: ${t("Sets: {count}", { count: style.sets })}` : ""}</title> : null}
          </path>
        );
      })}
    </g>
  );
}

export function MuscleBody({ muscles, label, description, compactView, className = "" }: {
  muscles: MuscleStyles;
  label: string;
  description: string;
  compactView?: ViewName;
  className?: string;
}) {
  const { width, height } = bodyViews.front;
  const views: readonly ViewName[] = compactView ? [compactView] : ["front", "back"];
  return (
    <svg viewBox={`0 0 ${compactView ? width : width * 2 + GAP} ${height + (compactView ? 0 : LABEL_SPACE)}`} role="img" aria-label={label} className={className}>
      <title>{compactView ? t("Muscle map: {view}", { view: t(compactView) }) : t("Muscle map: front and back")}</title>
      <desc>{description}</desc>
      {views.map((view, index) => (
        <g key={view} transform={`translate(${index * (width + GAP)} 0)`}>
          <BodyView view={view} muscles={muscles} compact={Boolean(compactView)} />
          {!compactView ? <text x={width / 2} y={height + LABEL_SPACE - 8} textAnchor="middle" className="fill-muted-foreground text-[32px] tracking-[5px] uppercase">{t(view)}</text> : null}
        </g>
      ))}
    </svg>
  );
}

export function MuscleMapCredit() {
  return <a href="https://github.com/melihcolpan/MuscleMap" target="_blank" rel="noreferrer" className="mt-3 block text-xs text-muted-foreground hover:underline">{t("Body illustration: MuscleMap, © Melih Colpan, MIT")}</a>;
}
