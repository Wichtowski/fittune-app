import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ProfileForm } from "./profile-form";
import { account } from "@/api/account";
import type { User } from "@/schemas/user";

afterEach(() => vi.restoreAllMocks());

it("prevents unsaved edits from being marked saved during a pending request", async () => {
  const user: User = {
    id: "00000000-0000-4000-8000-000000000001", username: "tester", email: "tester@example.com",
    display_name: "Before", birthday: null, role: "user", account_type: null,
    weight_unit: "kg", distance_unit: "km", created_at: "2026-01-01T00:00:00Z",
  };
  let complete!: (saved: User) => void;
  vi.spyOn(account, "updateProfile").mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><ProfileForm user={user} /></QueryClientProvider>);
  const name = screen.getByRole("textbox", { name: "Display name" });
  fireEvent.change(name, { target: { value: "Saved name" } });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await waitFor(() => expect(name).toBeDisabled());
  await act(async () => complete({ ...user, display_name: "Saved name" }));
  await waitFor(() => expect(name).toBeEnabled());
  expect(name).toHaveValue("Saved name");
  expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();
});
