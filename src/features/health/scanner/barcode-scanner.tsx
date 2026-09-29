import { useEffect, useRef, useState } from "react";

import { normalizeBarcode } from "../barcode";
import { createDetector } from "./detector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

/** How often a video frame is checked for a barcode */
const SCAN_INTERVAL_MS = 250;
/**
 * A working decoder answers "nothing found" for unreadable frames rather than throwing, so this
 * many errors in a row means it is broken (for example its WASM did not load)
 */
const MAX_FAILED_FRAMES = 3;

function ManualEntry({ reason, onDetected, onCancel }: { reason?: string; onDetected: (code: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const code = normalizeBarcode(text);
        if (code) onDetected(code);
        else setError(t("Check the digits, this is not a valid barcode"));
      }}
    >
      {reason ? <p className="text-sm text-muted-foreground">{reason}</p> : null}
      <div className="grid gap-2">
        <Label htmlFor="manual-barcode">{t("Barcode")}</Label>
        <Input id="manual-barcode" inputMode="numeric" autoComplete="off" value={text} maxLength={14} aria-invalid={error !== null}
          onChange={(event) => { setText(event.target.value.replace(/\D/g, "")); setError(null); }} autoFocus />
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t("Back")}</Button>
        <Button type="submit" disabled={text.length < 8}>{t("Look up")}</Button>
      </div>
    </form>
  );
}

/**
 * Reads a product barcode with the back camera; without a camera, or when access is refused,
 * it asks for the digits instead so adding food never dead-ends
 */
export function BarcodeScanner({ onDetected, onCancel }: { onDetected: (code: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState<{ reason?: string } | null>(
    typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia
      ? { reason: t("This device does not give the app a camera. Type the barcode instead.") }
      : null,
  );
  const detected = useRef(onDetected);
  useEffect(() => { detected.current = onDetected; }, [onDetected]);

  useEffect(() => {
    if (manual) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    // The camera stays off and the user types the barcode; the camera must never be left running
    const fallBack = (reason: string) => {
      if (stopped) return;
      stop();
      setManual({ reason });
    };
    const scannerFailed = () => fallBack(t("The barcode scanner failed. Type the barcode instead."));

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !video.current) {
          stop();
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
      } catch (error) {
        const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
        fallBack(denied ? t("Camera access was refused. Type the barcode instead.") : t("The camera could not start. Type the barcode instead."));
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
  }, [manual]);

  if (manual) return <ManualEntry reason={manual.reason} onDetected={onDetected} onCancel={onCancel} />;

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline aria-label={t("Camera")} />
        <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-primary" />
      </div>
      <p className="text-center text-sm text-muted-foreground">{t("Point the camera at the barcode on the pack")}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t("Back")}</Button>
        <Button type="button" variant="secondary" onClick={() => setManual({})}>{t("Type it instead")}</Button>
      </div>
    </div>
  );
}
