import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DraftSet } from "../draft";
import { SetRow } from "./set-row";

const set: DraftSet = { id: "set-1", kind: "normal", reps: 8, weight_kg: 60, duration_seconds: null, distance_m: null, rpe: null, completed: false };

function renderRow(overrides: Partial<React.ComponentProps<typeof SetRow>> = {}) {
  const onChange = vi.fn();
  render(
    <SetRow
      set={set}
      label="1"
      tracking="weight_reps"
      previous={null}
      weightUnit="kg"
      distanceUnit="km"
      weightStep={2.5}
      onChange={onChange}
      onToggleComplete={vi.fn()}
      onKind={vi.fn()}
      onRemove={vi.fn()}
      onUsePrevious={vi.fn()}
      {...overrides}
    />,
  );
  return onChange;
}

describe("set row steppers", () => {
  it("moves the weight by the chosen step", () => {
    const onChange = renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Increase Weight (kg) by 2.5" }));
    expect(onChange).toHaveBeenLastCalledWith("set-1", { weight_kg: 62.5 });
    fireEvent.click(screen.getByRole("button", { name: "Decrease Weight (kg) by 2.5" }));
    expect(onChange).toHaveBeenLastCalledWith("set-1", { weight_kg: 57.5 });
  });

  it("moves reps by one", () => {
    const onChange = renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Increase Reps by 1" }));
    expect(onChange).toHaveBeenLastCalledWith("set-1", { reps: 9 });
    fireEvent.click(screen.getByRole("button", { name: "Decrease Reps by 1" }));
    expect(onChange).toHaveBeenLastCalledWith("set-1", { reps: 7 });
  });

  it("steps pounds in pounds and stores kilograms", () => {
    const onChange = renderRow({ weightUnit: "lb", weightStep: 5, set: { ...set, weight_kg: null } });
    fireEvent.click(screen.getByRole("button", { name: "Increase Weight (lb) by 5" }));
    const patch = onChange.mock.lastCall?.[1] as { weight_kg: number };
    expect(patch.weight_kg).toBeCloseTo(2.268, 3);
  });

  it("cannot go below zero", () => {
    renderRow({ set: { ...set, reps: 0, weight_kg: null } });
    expect(screen.getByRole("button", { name: "Decrease Reps by 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease Weight (kg) by 2.5" })).toBeDisabled();
  });

  it("offers reps without a weight for bodyweight exercises", () => {
    renderRow({ tracking: "reps" });
    expect(screen.getByRole("button", { name: "Increase Reps by 1" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Weight (kg)" })).toBeNull();
  });
});
