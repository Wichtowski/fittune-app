import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExerciseLibrary } from "./exercise-library";
import { queryKeys } from "@/api/query-keys";
import type { Exercise } from "@/schemas/exercise";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => <a className={className}>{children}</a>,
}));

function exercise(name: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: name, name, tracking: "weight_reps", primary_muscle: "chest", secondary_muscles: [], equipment: "barbell",
    requires: [], difficulty: "beginner", video_id: null, instructions: null, instructions_pl: null, is_custom: false,
    created_by: null, archived_at: null, created_at: "", updated_at: "", media: [], ...overrides,
  };
}

function renderLibrary(onFilterChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(queryKeys.exercises.list(), [
    exercise("Barbell Bench Press"),
    exercise("Leg Press", { primary_muscle: "quadriceps" }),
    exercise("Viking Press", { is_custom: true, is_own: true, created_by: "Me" }),
    exercise("Prowler Push", { is_custom: true, is_own: false, created_by: "Olga" }),
  ]);
  // The owner keeps the filter in the URL and hands it back late; here it never does
  render(<QueryClientProvider client={client}><ExerciseLibrary filter={{}} onFilterChange={onFilterChange} /></QueryClientProvider>);
  return onFilterChange;
}

describe("exercise library search", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps what is typed without waiting for the owner to hand it back", () => {
    const onFilterChange = renderLibrary();
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "p" } });
    fireEvent.change(search, { target: { value: "pre" } });
    expect(search).toHaveValue("pre");
    expect(onFilterChange).not.toHaveBeenCalled();
    expect(screen.getByText("Leg Press")).toBeInTheDocument();
    expect(screen.getByText("Prowler Push")).toBeInTheDocument();
  });

  it("filters and tells the owner once typing settles", () => {
    const onFilterChange = renderLibrary();
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "ben" } });
    fireEvent.change(search, { target: { value: "bench" } });
    act(() => void vi.advanceTimersByTime(250));
    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith({ q: "bench" });
    expect(screen.getByText("Barbell Bench Press")).toBeInTheDocument();
    expect(screen.queryByText("Leg Press")).toBeNull();
    expect(search).toHaveValue("bench");
  });

  it("marks your own exercises and names who created the others", () => {
    renderLibrary();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByTitle("Created by Olga")).toHaveTextContent("Olga");
  });
});
