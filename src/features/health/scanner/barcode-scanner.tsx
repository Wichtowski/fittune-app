import { CameraOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { normalizeBarcode } from "../barcode";
import { createDetector } from "./detector";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/** How often a video frame is checked for a barcode */
const SCAN_INTERVAL_MS = 250;
/**
 * A working decoder answers "nothing found" for unreadable frames rather than throwing, so this
 * many errors in a row means it is broken (for example its WASM did not load)
 */
const MAX_FAILED_FRAMES = 3;

/** Why the camera is not scanning, and whether asking again can help */
type Problem = { message: string; hint?: string; retry?: "allow" | "again" };

/**
 * Camera errors in words a user can act on. A dismissed prompt can be shown again; a site the
 * user blocked cannot, browsers only re-ask once it is allowed in the site settings
 */
async function cameraProblem(error: unknown): Promise<Problem> {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotFoundError" || name === "OverconstrainedError") return { message: t("No camera found on this device.") };
  if (name === "NotAllowedError" || name === "SecurityError") {
    let state: PermissionState | undefined;
    try {
      state = (await navigator.permissions?.query({ name: "camera" as PermissionName }))?.state;
    } catch {
      // Safari and older browsers cannot query the camera permission
    }
    if (state === "denied") {
      return {
        message: t("Camera access is blocked for this site."),
        hint: t("Allow the camera for FitTune in your browser's site settings, then try again."),
        retry: "again",
      };
    }
    return { message: t("FitTune needs the camera to scan barcodes."), retry: "allow" };
  }
  if (name === "NotReadableError") return { message: t("Another app is using the camera. Close it and try again."), retry: "again" };
  return { message: t("The camera could not start."), retry: "again" };
}

/** Reads a product barcode with the back camera, stopping the camera as soon as it has one */
export function BarcodeScanner({ onDetected, onCancel }: { onDetected: (code: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  // Browsers only offer the camera on secure (https or localhost) pages
  const [problem, setProblem] = useState<Problem | null>(() =>
    typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia
      ? { message: t("The camera needs a secure (https) connection, or this browser has no camera access.") }
      : null,
  );
  // Each retry starts the camera again, and with it the browser's permission prompt
  const [attempt, setAttempt] = useState(0);
  const detected = useRef(onDetected);
  useEffect(() => {
    detected.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (problem) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    // The camera must never be left running behind a message
    const fail = (next: Problem) => {
      if (stopped) return;
      stop();
      setProblem(next);
    };
    const scannerFailed = () => fail({ message: t("The barcode scanner could not start."), retry: "again" });

    void (async () => {
      try {
        const granted = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        stream = granted;
        if (stopped || !video.current) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        video.current.srcObject = granted;
        await video.current.play();
      } catch (error) {
        if (!stopped) fail(await cameraProblem(error));
        return;
      }

      let detector: Awaited<ReturnType<typeof createDetector>>;
      try {
        detector = await createDetector();
      } catch {
        scannerFailed();
        return;
      }
      let failedFrames = 0;
      const tick = async () => {
        if (stopped || !video.current) return;
        try {
          const found = await detector.detect(video.current);
          if (stopped) return;
          failedFrames = 0;
          const code = found.map((b) => normalizeBarcode(b.rawValue)).find((c) => c !== null);
          if (code) {
            stop();
            detected.current(code);
            return;
          }
        } catch {
          failedFrames += 1;
          if (failedFrames >= MAX_FAILED_FRAMES) {
            scannerFailed();
            return;
          }
        }
        if (!stopped) timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS);
      };
      void tick();
    })();

    return stop;
  }, [problem, attempt]);

  if (problem) {
    return (
      <div className="grid gap-4">
        <div role="alert" className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center">
          <CameraOffIcon className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{problem.message}</p>
          {problem.hint ? <p className="max-w-sm text-sm text-muted-foreground">{problem.hint}</p> : null}
        </div>
        <div className={problem.retry ? "grid grid-cols-2 gap-2" : "grid"}>
          <Button type="button" variant="secondary" onClick={onCancel}>{t("Back")}</Button>
          {problem.retry ? (
            <Button
              type="button"
              onClick={() => {
                setProblem(null);
                setAttempt((n) => n + 1);
              }}
            >
              {problem.retry === "allow" ? t("Allow camera") : t("Try again")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline aria-label={t("Camera")} />
        <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-primary" />
      </div>
      <p className="text-center text-sm text-muted-foreground">{t("Point the camera at the barcode on the pack")}</p>
      <Button type="button" variant="secondary" onClick={onCancel}>{t("Back")}</Button>
    </div>
  );
}
