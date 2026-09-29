import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { BarcodeScanner } from "./barcode-scanner";
import { createDetector } from "./detector";

vi.mock("./detector", () => ({ createDetector: vi.fn() }));

const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;

function camera(getUserMedia: () => Promise<MediaStream>, permission?: PermissionState) {
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn(getUserMedia) },
    permissions: permission ? { query: vi.fn().mockResolvedValue({ state: permission }) } : undefined,
  });
  return (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>);
}

const refused = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));

beforeEach(() => {
  stop.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("stops the camera as soon as a barcode is detected", async () => {
  vi.mocked(createDetector).mockResolvedValue({ detect: vi.fn().mockResolvedValue([{ rawValue: "5900259127761" }]) });
  camera(() => Promise.resolve(stream));
  const onDetected = vi.fn();
  render(<BarcodeScanner onDetected={onDetected} onCancel={vi.fn()} />);

  await waitFor(() => expect(onDetected).toHaveBeenCalledWith("5900259127761"));
  expect(stop).toHaveBeenCalledTimes(1);
});

it("asks for the camera again after the prompt was dismissed", async () => {
  vi.mocked(createDetector).mockResolvedValue({ detect: vi.fn().mockResolvedValue([]) });
  let answer: () => Promise<MediaStream> = refused;
  const getUserMedia = camera(() => answer(), "prompt");
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);

  expect(await screen.findByText("FitTune needs the camera to scan barcodes.")).toBeInTheDocument();
  answer = () => Promise.resolve(stream);
  fireEvent.click(screen.getByRole("button", { name: "Allow camera" }));

  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  expect(await screen.findByLabelText("Camera")).toBeInTheDocument();
});

it("explains how to unblock the camera when the site is blocked, and retries", async () => {
  const getUserMedia = camera(refused, "denied");
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);

  expect(await screen.findByText(/blocked for this site/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
});

it("says so when the device has no camera", async () => {
  camera(() => Promise.reject(new DOMException("none", "NotFoundError")));
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);
  expect(await screen.findByText("No camera found on this device.")).toBeInTheDocument();
});

it("needs a secure connection for the camera", () => {
  vi.stubGlobal("navigator", {});
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByText(/secure \(https\) connection/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
});

it("stops the camera and offers a retry when the decoder keeps failing", async () => {
  vi.mocked(createDetector).mockResolvedValue({ detect: vi.fn().mockRejectedValue(new Error("WASM failed to load")) });
  camera(() => Promise.resolve(stream));
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);

  expect(await screen.findByText("The barcode scanner could not start.")).toBeInTheDocument();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});

it("stops the camera when the decoder cannot load", async () => {
  vi.mocked(createDetector).mockRejectedValue(new Error("WASM failed to load"));
  camera(() => Promise.resolve(stream));
  render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);

  expect(await screen.findByText("The barcode scanner could not start.")).toBeInTheDocument();
  expect(stop).toHaveBeenCalledTimes(1);
});

it("releases a camera granted after the scanner was closed", async () => {
  let grant!: (value: MediaStream) => void;
  camera(() => new Promise<MediaStream>((resolve) => { grant = resolve; }));
  const view = render(<BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} />);

  view.unmount();
  await act(async () => grant(stream));

  expect(stop).toHaveBeenCalledTimes(1);
});

it("ignores a frame finishing after the scanner was closed", async () => {
  let finish!: (codes: { rawValue: string }[]) => void;
  const detect = vi.fn(() => new Promise<{ rawValue: string }[]>((resolve) => { finish = resolve; }));
  vi.mocked(createDetector).mockResolvedValue({ detect });
  camera(() => Promise.resolve(stream));
  const onDetected = vi.fn();
  const view = render(<BarcodeScanner onDetected={onDetected} onCancel={vi.fn()} />);
  await waitFor(() => expect(detect).toHaveBeenCalledTimes(1));

  view.unmount();
  await act(async () => finish([{ rawValue: "5900259127761" }]));

  expect(onDetected).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledTimes(1);
});
