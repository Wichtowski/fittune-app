import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ActivityForm } from "./activity-form";
import { queryKeys } from "@/api/query-keys";

it.each(["hours", "seconds"])("shows validation feedback for invalid duration %s", async (field) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(queryKeys.me, { weight_unit: "kg", distance_unit: "km" });
  render(<QueryClientProvider client={client}><ActivityForm onDone={() => {}} /></QueryClientProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: field }), { target: { value: "-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Log activity" }));
  expect(await screen.findByText(/Too small/)).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: field })).toHaveAttribute("aria-invalid", "true");
});
