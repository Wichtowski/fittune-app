import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AddFoodDialog } from "./add-food-dialog";

// The camera and decoder have their own tests; here a scan simply reports a barcode
const scanner = vi.hoisted(() => ({ code: "" }));
vi.mock("../scanner/barcode-scanner", () => ({
  BarcodeScanner: ({ onDetected }: { onDetected: (code: string) => void }) => (
    <button type="button" onClick={() => onDetected(scanner.code)}>Detect barcode</button>
  ),
}));
import { fithealth } from "@/api/fithealth";
import type { Candidate, Product } from "@/schemas/health";

const oats: Product = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Oat flakes",
  brand: "Melvit",
  barcode: null,
  per_100g: { energy_kcal: 372, protein_g: 13, fat_g: 7, carbs_g: 60, saturated_fat_g: null, sugars_g: null, fiber_g: null, salt_g: null },
  serving_amount: 40,
  serving_name: "4 tablespoons",
  unit: "g",
  source: "manual",
};
const meal = { id: "00000000-0000-4000-8000-0000000000aa", name: "Breakfast" };

afterEach(() => vi.restoreAllMocks());

function renderDialog(onOpenChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AddFoodDialog open onOpenChange={onOpenChange} date="2026-09-29" meal={meal} />
    </QueryClientProvider>,
  );
  return onOpenChange;
}

it("searches, picks a product and logs the chosen amount", async () => {
  const search = vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [oats], off: [] });
  const put = vi.spyOn(fithealth, "putEntry").mockImplementation((id, input) =>
    Promise.resolve({ id, ...input, product_id: oats.id, product_name: oats.name, product_brand: oats.brand, per_100g: oats.per_100g }),
  );
  const onOpenChange = renderDialog();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "oat" } });
  await waitFor(() => expect(search).toHaveBeenLastCalledWith("oat", expect.anything()));
  fireEvent.click(await screen.findByRole("button", { name: /Oat flakes/ }));

  // Starts from the serving and shows what it contains
  const amount = await screen.findByRole("spinbutton", { name: "Amount (g)" });
  expect(amount).toHaveValue(40);
  expect(screen.getByText("149 kcal")).toBeInTheDocument();

  fireEvent.change(amount, { target: { value: "50" } });
  expect(screen.getByText("186 kcal")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add to Breakfast" }));

  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  expect(put.mock.calls[0]?.[1]).toEqual({ date: "2026-09-29", meal_id: meal.id, product_id: oats.id, amount: 50 });
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

it.each(["", "0.01", "5001"])("does not save an invalid amount (%s)", async (value) => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [oats], off: [] });
  const put = vi.spyOn(fithealth, "putEntry");
  renderDialog();

  fireEvent.click(await screen.findByRole("button", { name: /Oat flakes/ }));
  fireEvent.change(await screen.findByRole("spinbutton", { name: "Amount (g)" }), { target: { value } });
  expect(screen.getByRole("button", { name: "Add to Breakfast" })).toBeDisabled();
  expect(put).not.toHaveBeenCalled();
});

it("creates a missing product and continues to the amount", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [], off: [] });
  const create = vi.spyOn(fithealth, "createProduct").mockResolvedValue({ ...oats, serving_amount: null, serving_name: null });
  renderDialog();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "Oat flakes" } });
  fireEvent.click(await screen.findByRole("button", { name: "Create product" }));
  // The search text becomes the name
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Oat flakes");
  for (const [label, value] of [["Energy (kcal)", "372"], ["Protein (g)", "13"], ["Fat (g)", "7"], ["Carbohydrate (g)", "60"]]) {
    fireEvent.change(screen.getByRole("spinbutton", { name: label }), { target: { value } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));

  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(create.mock.calls[0]?.[0]).toMatchObject({ name: "Oat flakes", per_100g: { energy_kcal: 372, protein_g: 13, fat_g: 7, carbs_g: 60, sugars_g: null } });
  expect(await screen.findByRole("spinbutton", { name: "Amount (g)" })).toHaveValue(100);
});

const candidate: Candidate = {
  barcode: "5900259127761",
  name: "Płatki owsiane górskie",
  brand: "Melvit",
  main_category: "en:oat-flakes",
  per_100g: oats.per_100g,
  serving_amount: 40,
  serving_name: "40 g",
  unit: "g",
};

async function scan(code: string) {
  scanner.code = code;
  fireEvent.click(screen.getByRole("button", { name: "Scan barcode" }));
  fireEvent.click(await screen.findByRole("button", { name: "Detect barcode" }));
}

it("goes straight to the amount for a barcode FitHealth knows", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [], off: [] });
  const lookup = vi.spyOn(fithealth, "lookupBarcode").mockResolvedValue({ status: "found", product: oats });
  renderDialog();

  await scan("5900259127761");

  expect(await screen.findByRole("spinbutton", { name: "Amount (g)" })).toHaveValue(40);
  expect(lookup).toHaveBeenCalledWith("5900259127761");
});

it("prefills an Open Food Facts product and saves it as confirmed", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [], off: [] });
  vi.spyOn(fithealth, "lookupBarcode").mockResolvedValue({ status: "off", candidate });
  const create = vi.spyOn(fithealth, "createProduct").mockResolvedValue({ ...oats, source: "off", barcode: candidate.barcode });
  renderDialog();

  await scan("5900259127761");

  expect(await screen.findByRole("textbox", { name: "Name" })).toHaveValue("Płatki owsiane górskie");
  expect(screen.getByRole("spinbutton", { name: "Energy (kcal)" })).toHaveValue(372);
  expect(screen.getByRole("link", { name: /Open Food Facts/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));

  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(create.mock.calls[0]?.[0]).toMatchObject({ name: "Płatki owsiane górskie", barcode: "5900259127761", source: "off", serving_amount: 40 });
  expect(await screen.findByRole("spinbutton", { name: "Amount (g)" })).toBeInTheDocument();
});

it("opens an empty product form with the barcode for an unknown product", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [], off: [] });
  vi.spyOn(fithealth, "lookupBarcode").mockResolvedValue({ status: "not_found" });
  renderDialog();

  await scan("4006381333931");

  expect(await screen.findByText("4006381333931")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
  expect(screen.queryByRole("link", { name: /Open Food Facts/ })).not.toBeInTheDocument();
});

it("offers Open Food Facts products in search and confirms them before use", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [], off: [candidate] });
  renderDialog();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "platki" } });
  fireEvent.click(await screen.findByRole("button", { name: /Płatki owsiane górskie/ }));

  expect(await screen.findByRole("textbox", { name: "Name" })).toHaveValue("Płatki owsiane górskie");
  expect(screen.getByRole("link", { name: /Open Food Facts/ })).toBeInTheDocument();
});

it("keeps search open when a cancelled product creation finishes", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [], off: [candidate] });
  let complete!: (product: Product) => void;
  const create = vi.spyOn(fithealth, "createProduct").mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  renderDialog();
  fireEvent.click(await screen.findByRole("button", { name: /Płatki owsiane górskie/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("searchbox", { name: "Search products" })).toBeInTheDocument();

  await act(async () => complete(oats));

  expect(screen.getByRole("searchbox", { name: "Search products" })).toBeInTheDocument();
  expect(screen.queryByRole("spinbutton", { name: "Amount (g)" })).not.toBeInTheDocument();
});

it("asks for a drink in millilitres and logs the amount in them", async () => {
  const juice: Product = {
    ...oats,
    id: "00000000-0000-4000-8000-000000000002",
    name: "Orange juice",
    brand: null,
    per_100g: { energy_kcal: 45, protein_g: 0.7, fat_g: 0.2, carbs_g: 10, saturated_fat_g: null, sugars_g: null, fiber_g: null, salt_g: null },
    serving_amount: 250,
    serving_name: "1 glass",
    unit: "ml",
  };
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [juice], off: [] });
  const put = vi.spyOn(fithealth, "putEntry").mockImplementation((id, input) =>
    Promise.resolve({ id, ...input, unit: "ml", product_id: juice.id, product_name: juice.name, product_brand: null, per_100g: juice.per_100g }),
  );
  renderDialog();

  fireEvent.click(await screen.findByRole("button", { name: /Orange juice/ }));
  expect(await screen.findByRole("spinbutton", { name: "Amount (ml)" })).toHaveValue(250);
  expect(screen.getByRole("button", { name: /1 glass \(250 ml\)/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add to Breakfast" }));

  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  expect(put.mock.calls[0]?.[1]).toMatchObject({ product_id: juice.id, amount: 250 });
});

it("creates a drink labelled per 100 ml", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue({ products: [], off: [] });
  const create = vi.spyOn(fithealth, "createProduct").mockImplementation((input) => Promise.resolve({ ...oats, ...input, id: oats.id, barcode: null }));
  renderDialog();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "Kefir" } });
  fireEvent.click(await screen.findByRole("button", { name: "Create product" }));
  fireEvent.click(screen.getByRole("radio", { name: "Per 100 ml" }));
  for (const [label, value] of [["Energy (kcal)", "50"], ["Protein (g)", "3"], ["Fat (g)", "2"], ["Carbohydrate (g)", "4"]]) {
    fireEvent.change(screen.getByRole("spinbutton", { name: label }), { target: { value } });
  }
  fireEvent.change(screen.getByRole("spinbutton", { name: "Serving (ml)" }), { target: { value: "400" } });
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));

  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(create.mock.calls[0]?.[0]).toMatchObject({ name: "Kefir", unit: "ml", serving_amount: 400 });
  expect(await screen.findByRole("spinbutton", { name: "Amount (ml)" })).toHaveValue(400);
});
