import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExerciseAnimation, exerciseAnimationUrl, ExercisePhoto, ExerciseVideo, exerciseVideoSource, hasExercisePhotos, MediaCredits, mediaAttributions } from "./exercise-media";
import { API_BASE_URL } from "@/lib/env";
import { exerciseSchema, type ExerciseMedia } from "@/schemas/exercise";

const photoId = "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a01";
const media: ExerciseMedia[] = [
  { id: photoId, kind: "photo", provider: "fittune", position: 0, url: `/api/v1/exercise-media/${photoId}/file` },
  { id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a02", kind: "photo", provider: "fittune", position: 1, url: "/api/v1/exercise-media/finish/file" },
  { id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a03", kind: "video", provider: "vimeo", position: 0, external_id: "278191577" },
];

const gymVisual = "© Gym visual - https://gymvisual.com/";
const thumbnailId = "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a11";
const animationId = "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a12";
// What the API returns for an exercise imported from the dataset
const imported: ExerciseMedia[] = [
  { id: thumbnailId, kind: "photo", provider: "fittune", position: 0, url: `/api/v1/train/exercise-media/${thumbnailId}/file`, attribution: gymVisual },
  { id: animationId, kind: "animation", provider: "fittune", position: 0, url: `/api/v1/train/exercise-media/${animationId}/file`, attribution: gymVisual },
  { id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a13", kind: "video", provider: "youtube", position: 0, external_id: "hWbUlkb5Ms4" },
];

describe("imported exercise media", () => {
  it("parses animations and credits from the API", () => {
    const parsed = exerciseSchema.shape.media.parse(imported);
    expect(parsed).toEqual(imported);
    expect(exerciseAnimationUrl(parsed)).toBe(`${API_BASE_URL}/api/v1/train/exercise-media/${animationId}/file`);
    expect(exerciseAnimationUrl(media)).toBeNull();
  });

  it("plays the animation and names the exercise", () => {
    const { container } = render(<ExerciseAnimation name="Barbell Bench Press" muscle="chest" media={imported} />);
    expect(within(container).getByAltText("Barbell Bench Press animated demo")).toHaveAttribute(
      "src",
      `${API_BASE_URL}/api/v1/train/exercise-media/${animationId}/file`,
    );
  });

  it("falls back to the thumbnail when the animation cannot load", () => {
    const { container } = render(<ExerciseAnimation name="Barbell Bench Press" muscle="chest" media={imported} />);
    fireEvent.error(within(container).getByAltText("Barbell Bench Press animated demo"));
    // A lone photo is a thumbnail, not a start position
    expect(within(container).getByAltText("Barbell Bench Press")).toHaveAttribute(
      "src",
      `${API_BASE_URL}/api/v1/train/exercise-media/${thumbnailId}/file`,
    );
  });

  it("waits for a tap when the system asks for reduced motion", () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = (query: string) => ({ ...matchMedia(query), matches: query.includes("prefers-reduced-motion") });
    try {
      const { container } = render(<ExerciseAnimation name="Barbell Bench Press" muscle="chest" media={imported} />);
      expect(within(container).queryByAltText("Barbell Bench Press animated demo")).toBeNull();
      fireEvent.click(within(container).getByRole("button", { name: "Play animation" }));
      expect(within(container).getByAltText("Barbell Bench Press animated demo")).toBeInTheDocument();
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it("credits each source once and links it", () => {
    const freeExerciseDb = media.map((item) => (item.kind === "video" ? item : { ...item, attribution: "Free Exercise DB" }));
    expect(mediaAttributions([...imported, ...freeExerciseDb])).toEqual([gymVisual, "Free Exercise DB"]);
    expect(mediaAttributions(media)).toEqual([]);

    const { container } = render(<MediaCredits media={imported} />);
    expect(container).toHaveTextContent("Exercise media: © Gym visual - gymvisual.com");
    expect(within(container).getByRole("link", { name: "gymvisual.com" })).toHaveAttribute("href", "https://gymvisual.com/");
    expect(render(<MediaCredits media={media} />).container).toBeEmptyDOMElement();
  });
});

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
    expect(exercise.instructions_pl).toBeNull();
    expect(exerciseVideoSource(exercise)).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(exerciseVideoSource({ media: [], video_id: null })).toBeNull();
  });
});
