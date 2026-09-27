import { anatomy, bodyOutline, type MuscleRegion } from "../muscle-anatomy";
import { muscleLabels } from "@/lib/labels";
import type { Muscle } from "@/schemas/common";

type MuscleIllustrationProps = {
  muscle: Muscle;
  secondaryMuscles?: readonly Muscle[];
  className?: string;
};

function engagement(region: MuscleRegion, muscle: Muscle, secondaryMuscles: readonly Muscle[]) {
  if (muscle === "full_body" || region.muscle === muscle) return "primary";
  if (secondaryMuscles.includes("full_body") || (region.muscle && secondaryMuscles.includes(region.muscle))) return "secondary";
  return "inactive";
}

const regionColors = {
  primary: "fill-muscle-load-high stroke-background",
  secondary: "fill-muscle-load-low stroke-background",
  inactive: "fill-slate-400/35 stroke-background dark:fill-slate-500/40",
};

export function MuscleIllustration({ muscle, secondaryMuscles = [], className = "" }: MuscleIllustrationProps) {
  const secondary = [...new Set(secondaryMuscles)].filter((m) => m !== muscle);
  const label = `${muscle.replaceAll("_", " ")} bodypart illustration${secondary.length ? `; secondary: ${secondary.map((m) => muscleLabels[m]).join(", ")}` : ""}`;

  return (
    <svg viewBox="0 0 340 410" role="img" aria-label={label} className={className}>
      <title>Muscle map: front and back</title>
      <desc>Primary muscles are red. Secondary muscles are green. Other muscles are grey.</desc>
      {(["front", "back"] as const).map((view, index) => (
        <g key={view} transform={`translate(${index * 180} 0)`} strokeWidth="0.85" strokeLinejoin="round">
          <path
            d="M80 10 C66 10 62 20 63 32 L61 33 63 43 67 45 Q68 53 74 55 L74 64 86 64 86 55 Q92 53 93 45 L97 43 99 33 97 32 C98 20 94 10 80 10Z"
            className="fill-slate-400/25 stroke-slate-400/20"
          />
          {[false, true].map((mirror) => (
            <g key={String(mirror)} transform={mirror ? "translate(160 0) scale(-1 1)" : undefined}>
              <path d={bodyOutline} className="fill-slate-400/15 stroke-slate-400/20" />
              {anatomy[view].map((region) => {
                const state = engagement(region, muscle, secondary);
                return (
                  <g key={region.name} data-muscle={region.muscle ?? undefined} data-engagement={state}>
                    <title>{region.name}{state !== "inactive" ? ` (${state})` : ""}</title>
                    <path d={region.d} className={regionColors[state]} />
                    {region.fibres ? (
                      <path d={region.fibres} fill="none" className="stroke-background/25" strokeWidth="0.65" />
                    ) : null}
                  </g>
                );
              })}
              <path
                d="M53 283 Q60 279 65 284 L63 291 Q58 295 54 290Z M55 358 54 371 M60 358 60 371 M15 204 12 212 M19 206 17 216 M23 207 22 217"
                fill="none"
                className="stroke-slate-400/35"
              />
            </g>
          ))}
          <text x="80" y="404" textAnchor="middle" className="fill-muted-foreground text-[10px] tracking-[2px] uppercase">
            {view}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MuscleMap({ muscle, secondaryMuscles = [] }: Omit<MuscleIllustrationProps, "className">) {
  const secondary = [...new Set(secondaryMuscles)].filter((m) => m !== muscle && muscle !== "full_body");

  return (
    <figure aria-label="Muscles worked" className="rounded-xl border bg-muted/20 p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="font-semibold">Muscles worked</span>
        <span className="text-xs text-muted-foreground">Front & back</span>
      </figcaption>
      <MuscleIllustration muscle={muscle} secondaryMuscles={secondary} className="mx-auto w-full max-w-72" />
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
    </figure>
  );
}
