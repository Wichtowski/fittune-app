import { PlayIcon } from "lucide-react";
import { useState } from "react";

import { MuscleIllustration } from "./muscle-illustration";
import { Button } from "@/components/ui/button";
import type { Muscle } from "@/schemas/common";

// Exercise photos are from the public domain Free Exercise DB, pinned to one revision
const photoBase = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/a859101d633a01c4a1a920d6a8ce41dabba0705f/exercises";
const catalogPhotos: Record<string, string> = {
  "Barbell Bench Press": "Barbell_Bench_Press_-_Medium_Grip",
  "Incline Dumbbell Press": "Incline_Dumbbell_Press",
  "Dumbbell Fly": "Dumbbell_Flyes",
  "Cable Crossover": "Cable_Crossover",
  "Chest Dip": "Dips_-_Chest_Version",
  "Push-Up": "Pushups",
  "Barbell Back Squat": "Barbell_Full_Squat",
  "Front Squat": "Front_Barbell_Squat",
  "Leg Press": "Leg_Press",
  "Leg Extension": "Leg_Extensions",
  "Conventional Deadlift": "Barbell_Deadlift",
  "Romanian Deadlift": "Romanian_Deadlift",
  "Lying Leg Curl": "Lying_Leg_Curls",
  "Hip Thrust": "Barbell_Hip_Thrust",
  "Standing Calf Raise": "Standing_Calf_Raises",
  "Pull-Up": "Pullups",
  "Chin-Up": "Chin-Up",
  "Lat Pulldown": "Wide-Grip_Lat_Pulldown",
  "One-Arm Dumbbell Row": "One-Arm_Dumbbell_Row",
  "Barbell Row": "Bent_Over_Barbell_Row",
  "Seated Cable Row": "Seated_Cable_Rows",
  "Barbell Shrug": "Barbell_Shrug",
  "Overhead Press": "Barbell_Shoulder_Press",
  "Seated Dumbbell Shoulder Press": "Seated_Dumbbell_Press",
  "Lateral Raise": "Side_Lateral_Raise",
  "Rear Delt Fly": "Seated_Bent-Over_Rear_Delt_Raise",
  "Face Pull": "Face_Pull",
  "Barbell Curl": "Barbell_Curl",
  "Hammer Curl": "Hammer_Curls",
  "Incline Dumbbell Curl": "Incline_Dumbbell_Curl",
  "Triceps Pushdown": "Triceps_Pushdown",
  "Skull Crusher": "Lying_Triceps_Press",
  "Overhead Triceps Extension": "Standing_Dumbbell_Triceps_Extension",
  "Close-Grip Bench Press": "Close-Grip_Barbell_Bench_Press",
  "Wrist Curl": "Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench",
  "Plank": "Plank",
  "Hanging Leg Raise": "Hanging_Leg_Raise",
  "Cable Crunch": "Cable_Crunch",
  "Ab Wheel Rollout": "Ab_Roller",
  "Treadmill Run": "Running_Treadmill",
  "Rowing Machine": "Rowing_Stationary",
  "Stationary Bike": "Bicycling_Stationary",
  "Jump Rope": "Rope_Jumping",
};

type ExerciseVideoSource = { provider: "youtube" | "vimeo"; id: string };

const catalogVideos: Record<string, ExerciseVideoSource> = {
  "Barbell Bench Press": { provider: "youtube", id: "hWbUlkb5Ms4" },
  "Barbell Back Squat": { provider: "youtube", id: "8060FZiT5TA" },
  "Conventional Deadlift": { provider: "youtube", id: "ZaTM37cfiDs" },
  "Pull-Up": { provider: "youtube", id: "aNUSgyWRJYA" },
  "Barbell Curl": { provider: "vimeo", id: "278191577" },
};

export function exerciseVideoSource(name: string, videoId: string | null, isCustom: boolean): ExerciseVideoSource | null {
  return videoId ? { provider: "youtube", id: videoId } : isCustom ? null : catalogVideos[name] ?? null;
}

export function hasExercisePhotos(name: string, isCustom: boolean): boolean {
  return !isCustom && name in catalogPhotos;
}

export function ExercisePhoto({
  name,
  muscle,
  isCustom,
  frame = 0,
  className = "",
}: {
  name: string;
  muscle: Muscle;
  isCustom: boolean;
  frame?: 0 | 1;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = isCustom ? undefined : catalogPhotos[name];
  const src = photo ? `${photoBase}/${photo}/${frame}.jpg` : null;

  return (
    <span className={`relative flex items-center justify-center overflow-hidden bg-muted/50 ${className}`}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={`${name} ${frame === 0 ? "start" : "finish"} position`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : <MuscleIllustration muscle={muscle} compact className="h-4/5 w-4/5" />}
    </span>
  );
}

export function ExerciseVideo({ source, name }: { source: ExerciseVideoSource; name: string }) {
  const [playing, setPlaying] = useState(false);
  if (source.provider === "vimeo") {
    return (
      <Button variant="secondary" asChild>
        <a href={`https://vimeo.com/${source.id}`} target="_blank" rel="noopener noreferrer">
          <PlayIcon aria-hidden /> Watch demo on Vimeo
        </a>
      </Button>
    );
  }

  return playing ? (
    <div>
      <iframe
        className="aspect-video w-full rounded-xl"
        src={`https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1`}
        title={`${name} exercise demo`}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      <a href={`https://www.youtube.com/watch?v=${source.id}`} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-muted-foreground hover:underline">Open on YouTube</a>
    </div>
  ) : (
    <Button variant="secondary" onClick={() => setPlaying(true)}>
      <PlayIcon aria-hidden /> Watch demo
    </Button>
  );
}
