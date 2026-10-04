import { t } from "@/lib/i18n";
import { PlayIcon } from "lucide-react";
import { useState } from "react";

import { MuscleIllustration } from "./muscle-illustration";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
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

/** URL of the animated demo, for exercises that have one */
export function exerciseAnimationUrl(media: readonly ExerciseMedia[]): string | null {
  const animation = media.find((item) => item.kind === "animation");
  return animation?.kind === "animation" ? `${API_BASE_URL}${animation.url}` : null;
}

/** Every distinct credit of the stored media, in the order they first appear */
export function mediaAttributions(media: readonly ExerciseMedia[]): string[] {
  const credits = media.flatMap((item) => (item.kind !== "video" && item.attribution ? [item.attribution] : []));
  return [...new Set(credits)];
}

/** Only the first catalog's photo pairs show a start and a finish; a lone photo is a thumbnail */
function photoAlt(name: string, media: readonly ExerciseMedia[], frame: 0 | 1): string {
  const paired = media.some((item) => item.kind === "photo" && item.position === 1);
  return paired ? t("{name} {phase} position", { name, phase: frame === 0 ? t("start") : t("finish") }) : name;
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
          alt={photoAlt(name, media, frame)}
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

/**
 * The animated demo. It loops for as long as it is on screen, so people who asked their system
 * for less motion get the still thumbnail and start it themselves
 */
export function ExerciseAnimation({
  name,
  muscle,
  media,
  className = "",
}: {
  name: string;
  muscle: Muscle;
  media: readonly ExerciseMedia[];
  className?: string;
}) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [started, setStarted] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = exerciseAnimationUrl(media);

  if (!src || failedSrc === src) return <ExercisePhoto name={name} muscle={muscle} media={media} className={className} />;
  if (reducedMotion && !started) {
    return (
      <span className={`relative block ${className}`}>
        <ExercisePhoto name={name} muscle={muscle} media={media} className="size-full" />
        <Button variant="secondary" size="sm" onClick={() => setStarted(true)} className="absolute bottom-2 left-2">
          <PlayIcon aria-hidden />{" "}{t("Play animation")}
        </Button>
      </span>
    );
  }
  return (
    <span className={`relative flex items-center justify-center overflow-hidden bg-muted/50 ${className}`}>
      <img
        src={src}
        alt={t("{name} animated demo", { name })}
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 size-full object-contain"
        onError={() => setFailedSrc(src)}
      />
    </span>
  );
}

const URL_IN_TEXT = /(https?:\/\/[^\s]+)/;

/** The credits the media's licences require wherever the media are shown */
export function MediaCredits({ media, className = "" }: { media: readonly ExerciseMedia[]; className?: string }) {
  const credits = mediaAttributions(media);
  if (credits.length === 0) return null;
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      {t("Exercise media:")}{" "}
      {credits.map((credit, index) => (
        <span key={credit}>
          {index > 0 ? " · " : null}
          {credit.split(URL_IN_TEXT).map((part, i) =>
            URL_IN_TEXT.test(part) ? (
              <a key={i} href={part} target="_blank" rel="noreferrer" className="hover:underline">
                {part.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ) : (
              part
            ),
          )}
        </span>
      ))}
    </p>
  );
}

export function ExerciseVideo({ source, name }: { source: ExerciseVideoSource; name: string }) {
  const [playing, setPlaying] = useState(false);
  if (source.provider === "vimeo") {
    return (
      <Button variant="secondary" asChild>
        <a href={`https://vimeo.com/${source.id}`} target="_blank" rel="noopener noreferrer">
          <PlayIcon aria-hidden />{" "}{t("Watch demo on Vimeo")}{" "}</a>
      </Button>
    );
  }

  return playing ? (
    <div>
      <iframe
        className="aspect-video w-full rounded-xl"
        src={`https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1`}
        title={t("{name} exercise demo", { name })}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      <a href={`https://www.youtube.com/watch?v=${source.id}`} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-muted-foreground hover:underline">{t("Open on YouTube")}</a>
    </div>
  ) : (
    <Button variant="secondary" onClick={() => setPlaying(true)}>
      <PlayIcon aria-hidden />{" "}{t("Watch demo")}{" "}</Button>
  );
}
