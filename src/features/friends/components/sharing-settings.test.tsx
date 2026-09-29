import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SharingSettings } from "./sharing-settings";
import { account } from "@/api/account";
import { queryKeys } from "@/api/query-keys";

const updateSharing = vi.spyOn(account, "updateSharing").mockImplementation((sharing) => Promise.resolve(sharing));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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

  it("saves every setting when one is toggled", async () => {
    show();
    fireEvent.click(screen.getByRole("checkbox", { name: /Personal records/ }));
    await waitFor(() => expect(updateSharing).toHaveBeenCalledWith({ ...nothing, personal_records: true }, expect.anything()));
    expect(screen.getByRole("checkbox", { name: /Personal records/ })).toBeChecked();
  });
});
