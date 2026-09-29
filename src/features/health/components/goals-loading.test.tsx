import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { MealEditor } from "./meal-editor";
import { WeightLog } from "./weight-log";
import { fithealth } from "@/api/fithealth";

afterEach(() => vi.restoreAllMocks());

it("shows failed weight loading and retries without claiming there are no weights", async () => {
  vi.spyOn(fithealth, "getWeights").mockRejectedValueOnce(new Error("Weight history failed")).mockResolvedValue([]);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><WeightLog /></QueryClientProvider>);

  expect(screen.queryByText("No weight logged yet. Targets need one.")).not.toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("Weight history failed");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("No weight logged yet. Targets need one.")).toBeInTheDocument();
});

it("shows failed meal loading and retries", async () => {
  vi.spyOn(fithealth, "getMeals").mockRejectedValueOnce(new Error("Meals failed")).mockResolvedValue([{ id: "meal", name: "Breakfast", position: 0 }]);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MealEditor /></QueryClientProvider>);

  expect(await screen.findByRole("alert")).toHaveTextContent("Meals failed");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("textbox", { name: "Meal name" })).toHaveValue("Breakfast");
});
