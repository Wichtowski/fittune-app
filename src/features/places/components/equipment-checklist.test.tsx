import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EquipmentChecklist } from "./equipment-checklist";

afterEach(cleanup);

describe("EquipmentChecklist", () => {
  it("keeps selections in canonical order so unchanged places stay unchanged", () => {
    const onChange = vi.fn();
    render(<EquipmentChecklist value={["resistance_band"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Barbell" }));
    expect(onChange).toHaveBeenLastCalledWith(["barbell", "resistance_band"]);
  });

  it("selects and clears a whole group", () => {
    const onChange = vi.fn();
    const { rerender } = render(<EquipmentChecklist value={["dumbbells"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Select all cable" }));
    expect(onChange).toHaveBeenLastCalledWith(["dumbbells", "cable_station", "lat_pulldown", "seated_row"]);
    rerender(<EquipmentChecklist value={["dumbbells", "cable_station", "lat_pulldown", "seated_row"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear cable" }));
    expect(onChange).toHaveBeenLastCalledWith(["dumbbells"]);
  });
});
