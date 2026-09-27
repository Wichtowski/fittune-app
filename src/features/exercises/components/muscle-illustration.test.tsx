import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MuscleIllustration, MuscleMap } from "./muscle-illustration";
import { MUSCLES } from "@/schemas/common";

afterEach(cleanup);

describe("muscle map", () => {
  it("highlights every supported muscle group without highlighting unrelated muscles", () => {
    const { container, rerender } = render(<MuscleIllustration muscle="chest" />);
    for (const muscle of MUSCLES.filter((m) => m !== "cardio" && m !== "full_body")) {
      rerender(<MuscleIllustration muscle={muscle} />);
      const active = container.querySelectorAll('[data-engagement="primary"]');
      expect(active.length, muscle).toBeGreaterThan(0);
      for (const region of active) expect(region).toHaveAttribute("data-muscle", muscle);
      expect(container.querySelector('[data-engagement="secondary"]')).toBeNull();
    }
  });

  it("distinguishes primary and secondary targets and updates both views when the exercise changes", () => {
    const { container, rerender } = render(<MuscleMap muscle="chest" secondaryMuscles={["shoulders", "triceps", "chest", "triceps"]} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("chest bodypart illustration; secondary: Shoulders, Triceps");
    expect(screen.getByText("Shoulders, Triceps")).toBeInTheDocument();
    for (const region of container.querySelectorAll('[data-muscle="chest"]')) expect(region).toHaveAttribute("data-engagement", "primary");
    for (const region of container.querySelectorAll('[data-muscle="triceps"], [data-muscle="shoulders"]')) expect(region).toHaveAttribute("data-engagement", "secondary");
    expect(container.querySelector('[data-muscle="quadriceps"]')).toHaveAttribute("data-engagement", "inactive");

    rerender(<MuscleMap muscle="quadriceps" secondaryMuscles={["glutes", "hamstrings"]} />);
    expect(screen.getByText("Glutes, Hamstrings")).toBeInTheDocument();
    for (const region of container.querySelectorAll('[data-muscle="chest"], [data-muscle="triceps"], [data-muscle="shoulders"]')) expect(region).toHaveAttribute("data-engagement", "inactive");
    for (const region of container.querySelectorAll('[data-muscle="quadriceps"]')) expect(region).toHaveAttribute("data-engagement", "primary");
    for (const region of container.querySelectorAll('[data-muscle="glutes"], [data-muscle="hamstrings"]')) expect(region).toHaveAttribute("data-engagement", "secondary");
  });

  it("colours muscles on a heat scale where the hardest working muscle is red and helpers are green", () => {
    const { container } = render(<MuscleMap muscle="chest" secondaryMuscles={["triceps"]} />);
    const fill = (engagement: string) => container.querySelector(`[data-engagement="${engagement}"]`)?.getAttribute("class");
    expect(fill("primary")).toContain("fill-muscle-load-high");
    expect(fill("secondary")).toContain("fill-muscle-load-low");
    expect(screen.getByText("Primary").querySelector("span")).toHaveClass("bg-muscle-load-high");
    expect(screen.getByText("Secondary").querySelector("span")).toHaveClass("bg-muscle-load-low");
  });

  it("draws the skeleton without ever highlighting bones as worked muscles", () => {
    const { container } = render(<MuscleMap muscle="full_body" />);
    const bones = container.querySelectorAll('[data-kind="bone"]');
    expect(bones.length).toBeGreaterThan(0);
    for (const bone of bones) expect(bone).not.toHaveAttribute("data-engagement");
    expect(screen.getByRole("link", { name: /BodyParts3D/ })).toHaveAttribute("href", "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/");
  });

  it("keeps compact thumbnails to the view that shows the worked muscles", () => {
    const { container, rerender } = render(<MuscleIllustration muscle="lats" secondaryMuscles={["biceps"]} compact />);
    expect(screen.getByRole("img")).toHaveTextContent("Muscle map: back");
    expect(container.querySelector('[data-kind="bone"], [data-engagement="inactive"]')).toBeNull();
    expect(container.querySelector('[data-muscle="lats"]')).toHaveAttribute("data-engagement", "primary");
    rerender(<MuscleIllustration muscle="chest" compact />);
    expect(screen.getByRole("img")).toHaveTextContent("Muscle map: front");
  });

  it("handles full-body and cardio without inventing specific cardio targets", () => {
    const { container, rerender } = render(<MuscleMap muscle="full_body" secondaryMuscles={["abs"]} />);
    expect(container.querySelector('[data-engagement="inactive"], [data-engagement="secondary"]')).toBeNull();
    expect(screen.queryByText("Secondary")).not.toBeInTheDocument();
    rerender(<MuscleMap muscle="cardio" />);
    expect(container.querySelector('[data-engagement="primary"], [data-engagement="secondary"]')).toBeNull();
    expect(screen.getByText("Cardio describes the activity, not a specific muscle group.")).toBeInTheDocument();
    rerender(<MuscleMap muscle="cardio" secondaryMuscles={["calves"]} />);
    expect(container.querySelector('[data-muscle="calves"]')).toHaveAttribute("data-engagement", "secondary");
  });
});
