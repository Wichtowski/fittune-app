import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { EntryDialog } from "./entry-dialog";
import { fithealth } from "@/api/fithealth";
import { queryKeys } from "@/api/query-keys";
import type { Entry } from "@/schemas/health";

const entry: Entry = {
  id: "entry-a", date: "2026-09-28", meal_id: "meal", product_id: "product",
  product_name: "Oats", product_brand: null, grams: 50,
  per_100g: { energy_kcal: 372, protein_g: 13, fat_g: 7, carbs_g: 60, saturated_fat_g: null, sugars_g: null, fiber_g: null, salt_g: null },
};

afterEach(() => vi.restoreAllMocks());

it("does not close a new entry when the previous entry finishes saving", async () => {
  vi.spyOn(fithealth, "getMeals").mockResolvedValue([{ id: "meal", name: "Breakfast", position: 0 }]);
  let complete!: (entry: Entry) => void;
  const save = vi.spyOn(fithealth, "putEntry").mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const onOpenChange = vi.fn();
  const view = (value: Entry | null) => <QueryClientProvider client={client}><EntryDialog entry={value} onOpenChange={onOpenChange} /></QueryClientProvider>;
  const { rerender } = render(view(entry));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

  rerender(view(null));
  rerender(view({ ...entry, id: "entry-b", date: "2026-09-29", grams: 100 }));
  expect(screen.getByRole("spinbutton", { name: "Amount (g)" })).toHaveValue(100);
  await act(async () => complete(entry));

  expect(onOpenChange).not.toHaveBeenCalled();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.health.day(entry.date) });
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.health.day("2026-09-29") });
});
