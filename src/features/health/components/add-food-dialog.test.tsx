import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AddFoodDialog } from "./add-food-dialog";
import { fithealth } from "@/api/fithealth";
import type { Product } from "@/schemas/health";

const oats: Product = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Oat flakes",
  brand: "Melvit",
  barcode: null,
  per_100g: { energy_kcal: 372, protein_g: 13, fat_g: 7, carbs_g: 60, saturated_fat_g: null, sugars_g: null, fiber_g: null, salt_g: null },
  serving_g: 40,
  serving_name: "4 tablespoons",
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
  const search = vi.spyOn(fithealth, "searchProducts").mockResolvedValue([oats]);
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
  expect(put.mock.calls[0]?.[1]).toEqual({ date: "2026-09-29", meal_id: meal.id, product_id: oats.id, grams: 50 });
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

it("does not save an empty amount", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue([oats]);
  const put = vi.spyOn(fithealth, "putEntry");
  renderDialog();

  fireEvent.click(await screen.findByRole("button", { name: /Oat flakes/ }));
  fireEvent.change(await screen.findByRole("spinbutton", { name: "Amount (g)" }), { target: { value: "" } });
  expect(screen.getByRole("button", { name: "Add to Breakfast" })).toBeDisabled();
  expect(put).not.toHaveBeenCalled();
});

it("creates a missing product and continues to the amount", async () => {
  vi.spyOn(fithealth, "searchProducts").mockResolvedValue([]);
  const create = vi.spyOn(fithealth, "createProduct").mockResolvedValue({ ...oats, serving_g: null, serving_name: null });
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
