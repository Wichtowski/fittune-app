import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExercisePhoto, ExerciseVideo, exerciseVideoSource } from "./exercise-media";

describe("exercise media", () => {
  it("keeps the bodypart illustration when a photo cannot load", () => {
    const { container } = render(<ExercisePhoto name="Barbell Bench Press" muscle="chest" isCustom={false} />);
    const photo = screen.getByAltText("Barbell Bench Press start position");
    fireEvent.error(photo);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "chest bodypart illustration" })).toBeInTheDocument();
  });

  it("loads a video only when the user asks to watch it", () => {
    const { container } = render(<ExerciseVideo source={{ provider: "youtube", id: "hWbUlkb5Ms4" }} name="Barbell Bench Press" />);
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Watch demo" }));
    expect(screen.getByTitle("Barbell Bench Press exercise demo")).toBeInTheDocument();
  });

  it("opens the catalog curl demo on Vimeo", () => {
    const source = exerciseVideoSource("Barbell Curl", null, false);
    expect(source).toEqual({ provider: "vimeo", id: "278191577" });
    if (!source) throw new Error("Missing Barbell Curl video");
    render(<ExerciseVideo source={source} name="Barbell Curl" />);
    expect(screen.getByRole("link", { name: "Watch demo on Vimeo" })).toHaveAttribute("href", "https://vimeo.com/278191577");
  });
});
