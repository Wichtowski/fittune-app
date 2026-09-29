import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkoutPhotos } from "./progress-photos";
import { fittune } from "@/api/fittune";

vi.mock("@/api/fittune", () => ({ fittune: {
  listPhotos: vi.fn().mockResolvedValue([]),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  photoBlob: vi.fn(),
} }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function show(waitingForSync: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>
    <WorkoutPhotos workoutId="00000000-0000-4000-8000-000000000001" justCompleted waitingForSync={waitingForSync} />
  </QueryClientProvider>);
}

describe("workout progress photos", () => {
  it("prevents replacing a photo while its upload is pending", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.mocked(fittune.uploadPhoto).mockImplementation(() => new Promise(() => {}));
    show(false);
    fireEvent.change(screen.getByLabelText("Choose progress photo"), {
      target: { files: [new File(["photo"], "photo.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save photo" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Take photo" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Choose from library" })).toBeDisabled();
    expect(screen.getByLabelText("Choose progress photo")).toBeDisabled();
    expect(screen.getByLabelText("Take progress photo")).toBeDisabled();
  });

  it("lets a user skip the optional photo step and reopen it later", () => {
    show(false);
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose from library" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.queryByRole("button", { name: "Take photo" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add photo" }));
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
  });

  it("keeps a chosen photo unsaved until the workout has synced", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    show(true);
    const input = screen.getByLabelText("Choose progress photo");
    fireEvent.change(input, { target: { files: [new File(["photo"], "photo.jpg", { type: "image/jpeg" })] } });
    expect(screen.getByAltText("Photo preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save photo" })).toBeDisabled();
    expect(screen.getByText(/let the workout sync/)).toBeInTheDocument();
  });
});
