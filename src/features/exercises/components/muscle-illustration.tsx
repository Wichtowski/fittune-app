import { anatomyViewBox, anatomyViews, focusView, type AnatomyRegion, type ViewName } from "../anatomy";
import { muscleLabels } from "@/lib/labels";
import type { Muscle } from "@/schemas/common";

type MuscleIllustrationProps = {
  muscle: Muscle;
  secondaryMuscles?: readonly Muscle[];
  // Compact draws only the view that shows the most of the primary muscle, for thumbnails
  compact?: boolean;
  className?: string;
};

type Engagement = "primary" | "secondary" | "inactive";

function engagement(region: AnatomyRegion, muscle: Muscle, secondaryMuscles: readonly Muscle[]): Engagement {
  if (muscle === "full_body" || region.muscle === muscle) return "primary";
  if (secondaryMuscles.includes("full_body") || (region.muscle && secondaryMuscles.includes(region.muscle))) return "secondary";
  return "inactive";
}

const regionColors: Record<Engagement | "bone", string> = {
  primary: "fill-muscle-load-high",
  secondary: "fill-muscle-load-low",
  inactive: "fill-anatomy-muscle",
  // Bones share the untrained muscle colour so only worked muscles stand out
  bone: "fill-anatomy-muscle",
};

const VIEW_GAP = 24;
const LABEL_SPACE = 14;

function BodyView({ view, muscle, secondary, compact }: { view: ViewName; muscle: Muscle; secondary: readonly Muscle[]; compact: boolean }) {
  const { silhouette, regions } = anatomyViews[view];
  return (
    <>
      <path d={silhouette} className="fill-anatomy-muscle" />
      {regions.map((region) => {
        if (region.kind === "bone") {
          return compact ? null : (
            <path key={region.name} d={region.d} data-kind="bone" className={regionColors.bone}>
              <title>{region.name}</title>
            </path>
          );
        }
        const state = engagement(region, muscle, secondary);
        if (compact && state === "inactive") return null;
        return (
          <path key={region.name} d={region.d} data-muscle={region.muscle ?? undefined} data-engagement={state} className={regionColors[state]}>
            <title>{region.name}{state !== "inactive" ? ` (${state})` : ""}</title>
          </path>
        );
      })}
    </>
  );
}

export function MuscleIllustration({ muscle, secondaryMuscles = [], compact = false, className = "" }: MuscleIllustrationProps) {
  const secondary = [...new Set(secondaryMuscles)].filter((m) => m !== muscle);
  const label = `${muscle.replaceAll("_", " ")} bodypart illustration${secondary.length ? `; secondary: ${secondary.map((m) => muscleLabels[m]).join(", ")}` : ""}`;
  const { width, height } = anatomyViewBox;

  if (compact) {
    const view = muscle === "full_body" || muscle === "cardio" ? "front" : focusView[muscle];
    return (
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className={className}>
        <title>{`Muscle map: ${view}`}</title>
        <g stroke="var(--background)" strokeWidth="0.25" strokeLinejoin="round">
          <BodyView view={view} muscle={muscle} secondary={secondary} compact />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${width * 2 + VIEW_GAP} ${height + LABEL_SPACE}`} role="img" aria-label={label} className={className}>
      <title>Muscle map: front and back</title>
      <desc>Primary muscles are red. Secondary muscles are green. Other muscles and bones are grey.</desc>
      {(["front", "back"] as const).map((view, index) => (
        <g key={view} transform={`translate(${index * (width + VIEW_GAP)} 0)`}>
          <g stroke="var(--background)" strokeWidth="0.2" strokeLinejoin="round">
            <BodyView view={view} muscle={muscle} secondary={secondary} compact={false} />
          </g>
          <text x={width / 2} y={height + LABEL_SPACE - 2} textAnchor="middle" className="fill-muted-foreground text-[8px] tracking-[2px] uppercase">
            {view}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MuscleMap({ muscle, secondaryMuscles = [] }: Pick<MuscleIllustrationProps, "muscle" | "secondaryMuscles">) {
  const secondary = [...new Set(secondaryMuscles)].filter((m) => m !== muscle && muscle !== "full_body");

  return (
    <figure aria-label="Muscles worked" className="rounded-xl border bg-muted/20 p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="font-semibold">Muscles worked</span>
        <span className="text-xs text-muted-foreground">Front & back</span>
      </figcaption>
      <MuscleIllustration muscle={muscle} secondaryMuscles={secondary} className="mx-auto w-full max-w-80" />
      <dl className="mt-4 grid gap-2 border-t pt-3 text-xs">
        <div className="flex gap-2">
          <dt className="flex shrink-0 items-start gap-2 text-muted-foreground"><span aria-hidden className="mt-0.5 size-2.5 rounded-full bg-muscle-load-high" />Primary</dt>
          <dd className="font-medium">{muscleLabels[muscle]}</dd>
        </div>
        {secondary.length ? (
          <div className="flex gap-2">
            <dt className="flex shrink-0 items-start gap-2 text-muted-foreground"><span aria-hidden className="mt-0.5 size-2.5 rounded-full bg-muscle-load-low" />Secondary</dt>
            <dd className="font-medium">{secondary.map((m) => muscleLabels[m]).join(", ")}</dd>
          </div>
        ) : null}
      </dl>
      {muscle === "cardio" ? <p className="mt-3 text-xs text-muted-foreground">Cardio describes the activity, not a specific muscle group.</p> : null}
      <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noreferrer" className="mt-3 block text-xs text-muted-foreground hover:underline">
        Anatomy: BodyParts3D, © DBCLS, CC BY 4.0
      </a>
    </figure>
  );
}
