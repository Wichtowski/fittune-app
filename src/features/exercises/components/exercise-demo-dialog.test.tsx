import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExerciseDemoDialog, hasExerciseDemo } from "./exercise-demo-dialog";
import type { ExerciseMedia } from "@/schemas/exercise";

const media: ExerciseMedia[] = [
  { id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a11", kind: "photo", provider: "fittune", position: 0, url: "/api/v1/train/exercise-media/a/file", attribution: "© Gym visual - https://gymvisual.com/" },
  { id: "7c7f3c1e-1f7a-4c1e-9d3a-3e5b0c1d2a12", kind: "animation", provider: "fittune", position: 0, url: "/api/v1/train/exercise-media/b/file", attribution: "© Gym visual - https://gymvisual.com/" },
];

function open(exercise?: React.ComponentProps<typeof ExerciseDemoDialog>["exercise"]) {
  render(<ExerciseDemoDialog open onOpenChange={() => {}} name="Barbell Bench Press" muscle="chest" exercise={exercise} />);
}

describe("exercise demo dialog", () => {
  it("shows the demo first and folds the muscles away under it", () => {
    open({ media, video_id: null, secondary_muscles: ["triceps"] });
    const demo = screen.getByAltText("Barbell Bench Press animated demo");
    const muscles = screen.getByText("Muscles worked", { selector: "summary" });
    expect(demo.compareDocumentPosition(muscles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(muscles.closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText(/Exercise media:/)).toBeInTheDocument();
  });

  it("opens the muscles when there is no demo to show", () => {
    open({ media: [], video_id: null, secondary_muscles: [] });
    expect(screen.getByText("Muscles worked", { selector: "summary" }).closest("details")).toHaveAttribute("open");
    expect(screen.queryByRole("region", { name: "Exercise demo" })).toBeNull();
  });

  it("knows what counts as a demo", () => {
    expect(hasExerciseDemo(undefined)).toBe(false);
    expect(hasExerciseDemo({ media: [], video_id: null })).toBe(false);
    expect(hasExerciseDemo({ media: [], video_id: "hWbUlkb5Ms4" })).toBe(true);
    expect(hasExerciseDemo({ media, video_id: null })).toBe(true);
  });
});
