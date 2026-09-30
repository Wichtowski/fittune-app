import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SharingSettings } from "./sharing-settings";
import { account } from "@/api/account";
import { queryKeys } from "@/api/query-keys";

const getSharing = vi.spyOn(account, "getSharing");
const updateSharing = vi.spyOn(account, "updateSharing").mockImplementation((sharing) => Promise.resolve(sharing));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  getSharing.mockReset();
});

const nothing = { workouts: false, activities: false, stats: false, personal_records: false };

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(queryKeys.friends.sharing, nothing);
  return render(<QueryClientProvider client={client}><SharingSettings /></QueryClientProvider>);
}

describe("sharing settings", () => {
  it("starts private and never offers progress photos", () => {
    show();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    for (const box of boxes) expect(box).not.toBeChecked();
    expect(screen.queryByRole("checkbox", { name: /photo/i })).toBeNull();
  });

  it("prevents overlapping privacy changes until the save and refresh finish", async () => {
    let finishSave!: (sharing: typeof nothing) => void;
    let finishRefresh!: (sharing: typeof nothing) => void;
    updateSharing.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    getSharing.mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve; }));
    show();
    fireEvent.click(screen.getByRole("checkbox", { name: /Workouts/ }));
    await waitFor(() => expect(updateSharing).toHaveBeenCalledOnce());
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeDisabled();
    const saved = { ...nothing, workouts: true };
    await act(async () => { finishSave(saved); });
    await waitFor(() => expect(getSharing).toHaveBeenCalledOnce());
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeDisabled();
    await act(async () => { finishRefresh(saved); });
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Workouts/ })).toBeEnabled());
    expect(screen.getByRole("checkbox", { name: /Workouts/ })).toBeChecked();
  });

  it("saves every setting when one is toggled", async () => {
    getSharing.mockResolvedValue({ ...nothing, personal_records: true });
    show();
    fireEvent.click(screen.getByRole("checkbox", { name: /Personal records/ }));
    await waitFor(() => expect(updateSharing).toHaveBeenCalledWith({ ...nothing, personal_records: true }, expect.anything()));
    expect(screen.getByRole("checkbox", { name: /Personal records/ })).toBeChecked();
  });
});
