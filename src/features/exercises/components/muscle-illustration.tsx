import type { Muscle } from "@/schemas/common";

type Region = Exclude<Muscle, "full_body" | "cardio">;

const front: { muscle: Region; d: string }[] = [
  { muscle: "traps", d: "M25 24 36 29 47 24 44 33 28 33Z" },
  { muscle: "shoulders", d: "M22 27 29 29 28 39 19 41 17 35Z M43 29 50 27 55 35 53 41 44 39Z" },
  { muscle: "chest", d: "M29 30 36 32 43 30 44 43 36 46 28 43Z" },
  { muscle: "biceps", d: "M18 40 27 39 24 55 16 54Z M45 39 54 40 56 54 48 55Z" },
  { muscle: "forearms", d: "M16 55 24 56 20 76 12 75Z M48 56 56 55 60 75 52 76Z" },
  { muscle: "abs", d: "M29 47 36 49 43 47 44 69 36 72 28 69Z" },
  { muscle: "quadriceps", d: "M26 72 36 74 34 100 25 100Z M36 74 46 72 47 100 38 100Z" },
  { muscle: "calves", d: "M25 102 34 102 33 119 27 119Z M38 102 47 102 45 119 39 119Z" },
];

const back: { muscle: Region; d: string }[] = [
  { muscle: "traps", d: "M25 24 36 29 47 24 44 38 36 42 28 38Z" },
  { muscle: "shoulders", d: "M22 27 29 29 28 39 19 41 17 35Z M43 29 50 27 55 35 53 41 44 39Z" },
  { muscle: "triceps", d: "M18 40 27 39 24 55 16 54Z M45 39 54 40 56 54 48 55Z" },
  { muscle: "forearms", d: "M16 55 24 56 20 76 12 75Z M48 56 56 55 60 75 52 76Z" },
  { muscle: "upper_back", d: "M29 39 36 43 43 39 44 51 36 55 28 51Z" },
  { muscle: "lats", d: "M28 50 36 56 44 50 44 64 36 67 28 64Z" },
  { muscle: "lower_back", d: "M29 65 36 68 43 65 44 72 28 72Z" },
  { muscle: "glutes", d: "M27 73 36 74 45 73 47 85 36 89 25 85Z" },
  { muscle: "hamstrings", d: "M25 87 35 90 34 101 25 101Z M37 90 47 87 47 101 38 101Z" },
  { muscle: "calves", d: "M25 102 34 102 33 119 27 119Z M38 102 47 102 45 119 39 119Z" },
];

function Figure({ regions, muscle }: { regions: typeof front; muscle: Muscle }) {
  return (
    <g>
      <circle cx="36" cy="12" r="9" className="fill-muted-foreground/25" />
      <path
        d="M25 25 Q36 28 47 25 L54 31 61 75 52 78 47 55 47 82 48 101 46 120 39 120 36 89 33 120 26 120 24 101 25 82 25 55 20 78 11 75 18 31Z"
        className="fill-muted-foreground/25"
      />
      {regions.map((region) => (
        <path
          key={region.muscle}
          d={region.d}
          className={muscle === region.muscle || muscle === "full_body" ? "fill-primary" : "fill-muted-foreground/10"}
        />
      ))}
      {muscle === "cardio" ? <path d="M36 51 C22 42 23 61 36 69 C49 61 50 42 36 51Z" className="fill-primary" /> : null}
    </g>
  );
}

export function MuscleIllustration({ muscle, className = "" }: { muscle: Muscle; className?: string }) {
  return (
    <svg viewBox="0 0 160 128" role="img" aria-label={`${muscle.replaceAll("_", " ")} bodypart illustration`} className={className}>
      <Figure regions={front} muscle={muscle} />
      <g transform="translate(88)">
        <Figure regions={back} muscle={muscle} />
      </g>
    </svg>
  );
}
