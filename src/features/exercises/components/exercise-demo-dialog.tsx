import { ChevronDownIcon } from "lucide-react";

import { ExerciseAnimation, exerciseAnimationUrl, ExercisePhoto, ExerciseVideo, exerciseVideoSource, hasExercisePhotos, MediaCredits } from "./exercise-media";
import { MuscleMap } from "./muscle-illustration";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { t } from "@/lib/i18n";
import type { Muscle } from "@/schemas/common";
import type { Exercise } from "@/schemas/exercise";

type ExerciseDemoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  muscle: Muscle;
  /** The full exercise once it has loaded; until then only the primary muscle is known */
  exercise?: Pick<Exercise, "media" | "video_id" | "secondary_muscles">;
};

/** Whether an exercise has anything to show besides its muscles */
export function hasExerciseDemo(exercise: Pick<Exercise, "media" | "video_id"> | undefined): boolean {
  if (!exercise) return false;
  return exerciseAnimationUrl(exercise.media) !== null || hasExercisePhotos(exercise.media) || exerciseVideoSource(exercise) !== null;
}

/**
 * How an exercise is done, over the workout instead of inside its card: the demo first, since
 * that is what gets looked up between sets, and the muscles folded away under it.
 */
export function ExerciseDemoDialog({ open, onOpenChange, name, muscle, exercise }: ExerciseDemoDialogProps) {
  const media = exercise?.media ?? [];
  const videoSource = exercise ? exerciseVideoSource(exercise) : null;
  const hasAnimation = exerciseAnimationUrl(media) !== null;
  const hasDemo = hasExerciseDemo(exercise);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={name} className="md:max-w-lg">
      <div className="grid grid-cols-1 gap-4">
        {hasDemo ? (
          <section aria-label={t("Exercise demo")}>
            {hasAnimation ? (
              <ExerciseAnimation name={name} muscle={muscle} media={media} className="mx-auto aspect-square w-full max-w-[22.5rem] rounded-xl" />
            ) : hasExercisePhotos(media) ? (
              <div className="grid grid-cols-2 gap-2">
                <ExercisePhoto name={name} muscle={muscle} media={media} className="aspect-[4/3] rounded-xl" />
                <ExercisePhoto name={name} muscle={muscle} media={media} frame={1} className="aspect-[4/3] rounded-xl" />
              </div>
            ) : null}
            <MediaCredits media={media} className="mt-2" />
            {videoSource ? (
              <div className="mt-3">
                <ExerciseVideo key={`${videoSource.provider}-${videoSource.id}`} source={videoSource} name={name} />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Open when it is all there is to see */}
        <details open={!hasDemo} className="group rounded-xl border bg-muted/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            {t("Muscles worked")}
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="p-3 pt-0">
            <MuscleMap muscle={muscle} secondaryMuscles={exercise?.secondary_muscles} />
          </div>
        </details>
      </div>
    </ResponsiveDialog>
  );
}
