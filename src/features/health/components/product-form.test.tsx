import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { fithealth } from "@/api/fithealth";
import { OCR_FIELDS, type Extraction } from "@/schemas/ocr";
import { ProductForm, type ProductDraft } from "./product-form";

const suggestion: Extraction = { values: { energy_kcal: 100, fat_g: 4, saturated_fat_g: null, carbs_g: 10, sugars_g: null, fiber_g: null, protein_g: 3, salt_g: null }, warnings: {}, evidence: {}, unit: "g", columns: [], selected_column: null, source: "ocr" };
vi.mock("../ocr/label-scanner", () => ({ LabelScanner: ({ onApply }: { onApply: (result: Extraction) => void }) => <button type="button" onClick={() => onApply(suggestion)}>Apply fixture</button> }));

afterEach(() => vi.restoreAllMocks());
function form(initial: ProductDraft = { name: "Label product", barcode: "5900259127761" }) {
  const save = vi.spyOn(fithealth, "createProduct").mockImplementation(async (input) => ({ ...input, id: "00000000-0000-4000-8000-000000000001" }));
  render(<QueryClientProvider client={new QueryClient()}><ProductForm initial={initial} onSaved={vi.fn()} onCancel={vi.fn()} /></QueryClientProvider>);
  return save;
}

it("protects user edits and barcode, fills empty fields, and saves OCR provenance", async () => {
  const save = form();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Protein (g)" }), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Read nutrition label" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply fixture" }));
  expect(screen.getByRole("spinbutton", { name: "Protein (g)" })).toHaveValue(8);
  expect(screen.getByRole("spinbutton", { name: "Fat (g)" })).toHaveValue(4);
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]?.[0]).toMatchObject({ barcode: "5900259127761", source: "ocr", per_100g: { protein_g: 8, fat_g: 4, carbs_g: 10 } });
});

it("returns to manual provenance when every applied suggestion is replaced", async () => {
  const save = form();
  fireEvent.click(screen.getByRole("button", { name: "Read nutrition label" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply fixture" }));
  for (const [name, value] of [["Energy (kcal)", "120"], ["Protein (g)", "5"], ["Fat (g)", "6"], ["Carbohydrate (g)", "15"]]) fireEvent.change(screen.getByRole("spinbutton", { name }), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]?.[0].source).toBe("manual");
});

it("retains OFF provenance when supplementing a missing label", async () => {
  const save = form({ name: "OFF candidate", source: "off" });
  fireEvent.click(screen.getByRole("button", { name: "Read nutrition label" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply fixture" }));
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]?.[0].source).toBe("off");
});

it("never switches units underneath existing nutrients", () => {
  const values = Object.fromEntries(OCR_FIELDS.map((f) => [f, 1])) as typeof suggestion.values;
  form({ name: "Drink", unit: "ml", per_100g: { ...values, energy_kcal: 1, protein_g: 1, fat_g: 1, carbs_g: 1 } });
  fireEvent.click(screen.getByRole("button", { name: "Read nutrition label" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply fixture" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Suggestion units differ");
  expect(screen.getByRole("radio", { name: "Per 100 ml" })).toBeChecked();
});
