import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FriendFeed } from "./friend-feed";
import { account } from "@/api/account";
import { renderInRouter } from "@/test/router";

const bobby = { id: "00000000-0000-4000-8000-000000000002", username: "bobby", display_name: null };
const photoId = "00000000-0000-4000-8000-000000000003";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  renderInRouter(() => (
    <QueryClientProvider client={client}>
      <FriendFeed emptyDescription="empty" />
    </QueryClientProvider>
  ));
}

describe("friend feed", () => {
  it("shows a shared progress photo, loaded through the friend's photo endpoint", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:friend-photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(account, "getFriendFeed").mockResolvedValue({
      items: [{ type: "photo", user: bobby, id: photoId, taken_at: "2026-10-17T08:00:00Z", width: 1536, height: 2048 }],
      next_cursor: null,
    });
    const blob = vi.spyOn(account, "friendPhotoBlob").mockResolvedValue(new Blob(["jpeg"]));
    show();

    expect(await screen.findByRole("link", { name: "bobby" })).toBeInTheDocument();
    expect(screen.getByText("Progress photo")).toBeInTheDocument();
    expect(await screen.findByAltText("Progress photo of bobby")).toHaveAttribute("src", "blob:friend-photo");
    expect(blob).toHaveBeenCalledWith(bobby.id, photoId, "thumb");
  });
});
