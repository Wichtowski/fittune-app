import { PlayIcon } from "lucide-react";
import { useState } from "react";

import { MuscleIllustration } from "./muscle-illustration";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/env";
import type { Muscle } from "@/schemas/common";
import type { Exercise, ExerciseMedia } from "@/schemas/exercise";

type ExerciseVideoSource = { provider: "youtube" | "vimeo"; id: string };

/** The first video in `media`, or the YouTube `video_id` of an API that predates `media` */
export function exerciseVideoSource(exercise: Pick<Exercise, "media" | "video_id">): ExerciseVideoSource | null {
  const video = exercise.media.find((item) => item.kind === "video");
  if (video) return { provider: video.provider, id: video.external_id };
  return exercise.video_id ? { provider: "youtube", id: exercise.video_id } : null;
}

export function hasExercisePhotos(media: readonly ExerciseMedia[]): boolean {
  return media.some((item) => item.kind === "photo");
}

function photoUrl(media: readonly ExerciseMedia[], frame: 0 | 1): string | null {
  const photo = media.find((item) => item.kind === "photo" && item.position === frame);
  return photo?.kind === "photo" ? `${API_BASE_URL}${photo.url}` : null;
}

export function ExercisePhoto({
  name,
  muscle,
  media = [],
  frame = 0,
  className = "",
}: {
  name: string;
  muscle: Muscle;
  media?: readonly ExerciseMedia[];
  frame?: 0 | 1;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = photoUrl(media, frame);

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
