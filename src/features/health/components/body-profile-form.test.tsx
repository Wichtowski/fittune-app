import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { BodyProfileForm } from "./body-profile-form";
import { fithealth } from "@/api/fithealth";
import type { Profile } from "@/schemas/health";

const blank: Profile = {
  sex: null,
  height_cm: null,
  activity: null,
  goal: null,
  pace_kg_per_week: null,
  energy_kcal: null,
  protein_g: null,
  fat_g: null,
  carbs_g: null,
};

afterEach(() => vi.restoreAllMocks());

function renderForm(profile: Profile) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BodyProfileForm profile={profile} />
    </QueryClientProvider>,
  );
}

it("asks for the body details before saving", async () => {
  const save = vi.spyOn(fithealth, "saveProfile");
  renderForm(blank);
  fireEvent.click(screen.getByRole("button", { name: "Save goals" }));
  expect(await screen.findByText("Enter your height")).toBeInTheDocument();
  expect(screen.getByText("Choose one")).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

it("saves keeping weight without a pace and without own targets", async () => {
  const save = vi.spyOn(fithealth, "saveProfile").mockImplementation((input) => Promise.resolve({ ...blank, ...input }));
  renderForm(blank);

  fireEvent.click(screen.getByRole("radio", { name: "Female" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Height (cm)" }), { target: { value: "168" } });
  fireEvent.click(screen.getByRole("button", { name: "Save goals" }));

  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]?.[0]).toEqual({
    sex: "female",
    height_cm: 168,
    activity: "light",
    goal: "maintain",
    pace_kg_per_week: 0,
    energy_kcal: null,
    protein_g: null,
    fat_g: null,
    carbs_g: null,
  });
});

it("sends the chosen pace and own targets when losing", async () => {
  const save = vi.spyOn(fithealth, "saveProfile").mockImplementation((input) => Promise.resolve({ ...blank, ...input }));
  renderForm({ ...blank, sex: "male", height_cm: 180, activity: "moderate", goal: "maintain", pace_kg_per_week: 0 });

  fireEvent.click(screen.getByRole("radio", { name: "Lose" }));
  expect(await screen.findByText("Pace")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Protein (g)" }), { target: { value: "170" } });
  fireEvent.click(screen.getByRole("button", { name: "Save goals" }));

  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]?.[0]).toMatchObject({ goal: "lose", pace_kg_per_week: 0.5, protein_g: 170, energy_kcal: null });
});
