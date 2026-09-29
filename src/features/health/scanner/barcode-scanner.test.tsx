import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { BarcodeScanner } from "./barcode-scanner";
import { createDetector } from "./detector";

vi.mock("./detector", () => ({ createDetector: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("releases a camera granted after switching to manual entry", async () => {
  let grant!: (stream: MediaStream) => void;
  const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => { grant = resolve; }));
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Type it instead" }));
  expect(screen.getByRole("textbox", { name: "Barcode" })).toBeInTheDocument();
  await act(async () => grant(stream));

  expect(stop).toHaveBeenCalledTimes(1);
});

it("ignores a frame finishing after the user switches to manual entry", async () => {
  let finish!: (codes: { rawValue: string }[]) => void;
  const detect = vi.fn(() => new Promise<{ rawValue: string }[]>((resolve) => { finish = resolve; }));
  vi.mocked(createDetector).mockResolvedValue({ detect });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const stop = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  const onDetected = vi.fn();
  render(<BarcodeScanner onDetected={onDetected} onCancel={vi.fn()} />);
  await waitFor(() => expect(detect).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole("button", { name: "Type it instead" }));
  await act(async () => finish([{ rawValue: "5900259127761" }]));

  expect(onDetected).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledTimes(1);
});

it("stops the camera as soon as a barcode is detected", async () => {
  vi.mocked(createDetector).mockResolvedValue({ detect: vi.fn().mockResolvedValue([{ rawValue: "5900259127761" }]) });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const stop = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  const onDetected = vi.fn();
  render(<BarcodeScanner onDetected={onDetected} onCancel={vi.fn()} />);

  await waitFor(() => expect(onDetected).toHaveBeenCalledWith("5900259127761"));
  expect(stop).toHaveBeenCalledTimes(1);
});

it("offers manual entry when the decoder fails instead of retrying forever", async () => {
  vi.mocked(createDetector).mockResolvedValue({ detect: vi.fn().mockRejectedValue(new Error("WASM failed to load")) });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const stop = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);

  expect(await screen.findByRole("textbox", { name: "Barcode" })).toBeInTheDocument();
  expect(screen.getByText("The barcode scanner failed. Type the barcode instead.")).toBeInTheDocument();
  expect(stop).toHaveBeenCalledTimes(1);
});
