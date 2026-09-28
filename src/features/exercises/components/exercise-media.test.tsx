import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExercisePhoto, ExerciseVideo, exerciseVideoSource, hasExercisePhotos } from "./exercise-media";
import { API_BASE_URL } from "@/lib/env";
import { exerciseSchema, type ExerciseMedia } from "@/schemas/exercise";

const photoId = "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a01";
const media: ExerciseMedia[] = [
  { id: photoId, kind: "photo", provider: "fittune", position: 0, url: `/api/v1/exercise-media/${photoId}/file` },
  { id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a02", kind: "photo", provider: "fittune", position: 1, url: "/api/v1/exercise-media/finish/file" },
  { id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a03", kind: "video", provider: "vimeo", position: 0, external_id: "278191577" },
];

describe("exercise media", () => {
  it("loads catalog photos from the API", () => {
    const { container } = render(<ExercisePhoto name="Barbell Bench Press" muscle="chest" media={media} />);
    expect(within(container).getByAltText("Barbell Bench Press start position")).toHaveAttribute(
      "src",
      `${API_BASE_URL}/api/v1/exercise-media/${photoId}/file`,
    );
    expect(hasExercisePhotos(media)).toBe(true);
  });

  it("keeps the bodypart illustration when a photo cannot load", () => {
    const { container } = render(<ExercisePhoto name="Barbell Bench Press" muscle="chest" media={media} />);
    const photo = within(container).getByAltText("Barbell Bench Press start position");
    fireEvent.error(photo);
    expect(container.querySelector("img")).toBeNull();
    expect(within(container).getByRole("img", { name: "chest bodypart illustration" })).toBeInTheDocument();
  });

  it("shows the illustration for exercises without photos", () => {
    const { container } = render(<ExercisePhoto name="Landmine Press" muscle="shoulders" />);
    expect(container.querySelector("img[src]")).toBeNull();
    expect(hasExercisePhotos([])).toBe(false);
  });

  it("loads a video only when the user asks to watch it", () => {
    const { container } = render(<ExerciseVideo source={{ provider: "youtube", id: "hWbUlkb5Ms4" }} name="Barbell Bench Press" />);
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Watch demo" }));
    expect(screen.getByTitle("Barbell Bench Press exercise demo")).toBeInTheDocument();
  });

  it("opens a Vimeo demo on Vimeo", () => {
    const source = exerciseVideoSource({ media, video_id: null });
    expect(source).toEqual({ provider: "vimeo", id: "278191577" });
    if (!source) throw new Error("Missing Barbell Curl video");
    render(<ExerciseVideo source={source} name="Barbell Curl" />);
    expect(screen.getByRole("link", { name: "Watch demo on Vimeo" })).toHaveAttribute("href", "https://vimeo.com/278191577");
  });

  it("falls back to video_id from an API without media", () => {
    const exercise = exerciseSchema.parse({
      id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a04",
      name: "Landmine Press",
      tracking: "weight_reps",
      primary_muscle: "shoulders",
      secondary_muscles: [],
      equipment: "barbell",
      requires: [],
      difficulty: "beginner",
      video_id: "dQw4w9WgXcQ",
      instructions: null,
      is_custom: true,
      archived_at: null,
      created_at: "2026-09-28T12:00:00Z",
      updated_at: "2026-09-28T12:00:00Z",
    });
    expect(exercise.media).toEqual([]);
    expect(exerciseVideoSource(exercise)).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(exerciseVideoSource({ media: [], video_id: null })).toBeNull();
  });
});
