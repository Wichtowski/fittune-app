import { useEffect, useRef, useState, type PointerEvent } from "react";

import { fithealth } from "@/api/fithealth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { t } from "@/lib/i18n";
import { OCR_FIELDS, OCR_LABELS, type Extraction, type OcrInput } from "@/schemas/ocr";
import { cropImage, fullCrop, type Crop } from "./image";

type Engine = "local" | "rapid" | "ai";

const corners = [["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]] as const;

export function LabelScanner({ onApply, onClose }: { onApply: (result: Extraction) => void; onClose: () => void }) {
  const [url, setUrl] = useState<string>();
  const [crop, setCrop] = useState<Crop>(fullCrop);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Extraction>();
  const [capabilities, setCapabilities] = useState({ ai: false, rapid: false });
  const [retryAt, setRetryAt] = useState<Record<Engine, number>>({ local: 0, rapid: 0, ai: 0 });
  const [aiConsent, setAiConsent] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const operation = useRef<AbortController | null>(null);
  const observations = useRef<OcrInput | undefined>(undefined);
  const resultEngine = useRef<"local" | "rapid">("local");
  const prepared = useRef<Blob | undefined>(undefined);
  const token = useSession((state) => state.token);

  useEffect(() => {
    const controller = new AbortController();
    void fithealth.ocrCapabilities(controller.signal).then(setCapabilities).catch(() => {});
    return () => { controller.abort(); operation.current?.abort(); };
  }, [token]);
  useEffect(() => {
    const next = Math.min(...Object.values(retryAt).filter((time) => time > 0));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => setRetryAt((prior) => ({
      local: prior.local > Date.now() ? prior.local : 0,
      rapid: prior.rapid > Date.now() ? prior.rapid : 0,
      ai: prior.ai > Date.now() ? prior.ai : 0,
    })), Math.max(0, next - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const invalidate = () => {
    operation.current?.abort();
    operation.current = null;
    setBusy(false);
    setResult(undefined);
    setAiConsent(false);
    prepared.current = undefined;
    observations.current = undefined;
  };
  const moveHandle = (event: PointerEvent<HTMLButtonElement>, horizontal: "left" | "right", vertical: "top" | "bottom") => {
    if (busy || !image.current || event.buttons === 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = image.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100));
    invalidate();
    setCrop((c) => ({ ...c, [horizontal]: horizontal === "left" ? Math.min(x, c.right - 2) : Math.max(x, c.left + 2), [vertical]: vertical === "top" ? Math.min(y, c.bottom - 2) : Math.max(y, c.top + 2) }));
  };

  const run = async (engine: Engine, column?: number) => {
    if (!image.current || operation.current || Date.now() < retryAt[engine]) return;
    const session = useSession.getState().token;
    const controller = new AbortController();
    operation.current = controller;
    const timer = setTimeout(() => controller.abort(), engine === "local" ? 60_000 : 30_000);
    setBusy(true);
    setError("");
    setProgress(0);
    const current = () => !controller.signal.aborted && operation.current === controller && useSession.getState().token === session;
    try {
      const file = prepared.current ?? await cropImage(image.current, crop, rotation);
      if (!current()) return;
      prepared.current = file;
      let next: Extraction;
      if (engine === "local") {
        const { recognize } = await import("./nutrition-ocr");
        const input = observations.current ?? await recognize(file, controller.signal, setProgress);
        if (!current()) return;
        observations.current = input;
        next = await fithealth.parseLabel({ ...input, column }, controller.signal);
      } else {
        const text = (observations.current?.observations ?? []).map((o) => o.text).join(" ");
        next = await fithealth.extractLabel(engine, file, text, column, controller.signal);
      }
      if (current()) { setResult(next); if (engine !== "ai") resultEngine.current = engine; }
    } catch (failure) {
      if (operation.current === controller && useSession.getState().token === session) {
        setError(controller.signal.aborted ? t("Extraction cancelled. Your draft is unchanged.") : failure instanceof ApiError ? t(failure.message) : t("Could not read this label. Recrop or enter values manually."));
        if (failure instanceof ApiError && failure.retryAfter) setRetryAt((prior) => ({ ...prior, [engine]: Date.now() + failure.retryAfter! * 1000 }));
      }
    } finally {
      clearTimeout(timer);
      if (operation.current === controller) { operation.current = null; setBusy(false); }
    }
  };

  return (
    <section className="grid gap-3 rounded-xl border bg-muted/30 p-3" aria-label={t("Read nutrition label")}>
      <p className="text-sm">{t("Photograph the label, then crop around the table including the per-100 or portion header.")}</p>
      <label className="grid gap-2 text-sm font-medium">
        {t("Take or choose a label photo")}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > 12 * 1024 * 1024) { setError(t("Photo is too large. Use a photo below 12 MiB.")); return; }
          invalidate(); setError(""); setCrop(fullCrop); setRotation(0); setUrl(URL.createObjectURL(file));
        }} />
      </label>
      {url ? <>
        <div className="relative select-none">
          <img ref={image} src={url} alt={t("Full-resolution label photo")} className="block h-auto w-full" onError={() => { invalidate(); setUrl(undefined); setError(t("Could not open this photo. Choose a JPEG, PNG or WebP image.")); }} onLoad={() => {
            const photo = image.current;
            if (photo && photo.naturalWidth * photo.naturalHeight > 24_000_000) { invalidate(); setUrl(undefined); setError(t("Photo resolution is too large. Use a photo below 24 megapixels.")); }
          }} />
          <div aria-hidden className="pointer-events-none absolute border-2 border-primary bg-primary/5" style={{ left: `${crop.left}%`, top: `${crop.top}%`, width: `${crop.right - crop.left}%`, height: `${crop.bottom - crop.top}%` }} />
          {corners.map(([h, v]) => <button key={`${h}-${v}`} type="button" aria-label={t(`Crop ${h} ${v}`)} disabled={busy} className="absolute size-8 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-background bg-primary shadow" style={{ left: `${crop[h]}%`, top: `${crop[v]}%` }} onPointerDown={(event) => moveHandle(event, h, v)} onPointerMove={(event) => moveHandle(event, h, v)} />)}
        </div>
        <div className="grid grid-cols-2 gap-3">{(["left", "right", "top", "bottom"] as const).map((edge) => <label className="grid gap-1 text-xs" key={edge}>{t(`Crop ${edge}`)}<input type="range" min={edge === "right" ? crop.left + 2 : edge === "bottom" ? crop.top + 2 : 0} max={edge === "left" ? crop.right - 2 : edge === "top" ? crop.bottom - 2 : 100} value={crop[edge]} disabled={busy} onChange={(event) => { invalidate(); setCrop({ ...crop, [edge]: Number(event.target.value) }); }} /></label>)}</div>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { invalidate(); setRotation((r) => (r + 90) % 360); }}>{t("Rotate crop 90°")} ({rotation}°)</Button>
        <p className="text-xs text-muted-foreground">{t("Local OCR reads the crop on this device. Only recognized text and positions go to FitTune's parser. Photos are kept in memory for this form.")}</p>
        <Button type="button" disabled={busy || retryAt.local > 0} onClick={() => void run("local")}>{t("Read on this device")}</Button>
        {capabilities.rapid ? <><p className="text-xs text-muted-foreground">{t("Server OCR sends only this crop to FitTune. It is processed in memory and is not saved.")}</p><Button type="button" variant="secondary" disabled={busy || retryAt.rapid > 0} onClick={() => void run("rapid")}>{t("Try server OCR")}</Button></> : null}
        {capabilities.ai ? <>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={aiConsent} disabled={busy} onChange={(event) => setAiConsent(event.target.checked)} />{t("Send this crop and recognized text to OpenAI. FitTune does not save the image; OpenAI may retain data under its API policy. AI suggestions can be wrong.")}</label>
          <Button type="button" variant="secondary" disabled={busy || retryAt.ai > 0 || !aiConsent} onClick={() => void run("ai")}>{t("Try OpenAI")}</Button>
        </> : null}
      </> : null}
      {busy ? <div role="status" className="text-sm">{t("Reading label…")} {Math.round(progress * 100)}% <Button type="button" size="sm" variant="outline" onClick={() => operation.current?.abort()}>{t("Cancel")}</Button></div> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {Object.entries(retryAt).filter(([, time]) => time > 0).map(([engine, time]) => <p className="text-sm" key={engine}>{t(engine === "local" ? "Local OCR" : engine === "rapid" ? "Server OCR" : "OpenAI")}: {t("Retry after")} {new Date(time).toLocaleTimeString()}</p>)}
      {result ? <>
        {result.columns.length > 1 ? <label className="grid gap-1 text-sm">{t("Label column")}<select className="h-10 rounded-md border bg-background px-2" value={result.selected_column ?? ""} disabled={busy} onChange={(event) => { if (event.target.value !== "") void run(resultEngine.current, Number(event.target.value)); }}><option value="">{t("Select a column")}</option>{result.columns.map((c, i) => <option value={i} key={i}>{c.label} ({c.amount} {c.unit})</option>)}</select></label> : null}
        <p className="text-sm font-medium">{result.unit ? t(`Suggestions per 100 ${result.unit}`) : t("Column basis is unclear. Recrop or enter values manually.")}</p>
        {result.warnings.basis?.map((warning) => <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">{t(warning)}</p>)}
        <dl className="grid gap-2 text-sm">{OCR_FIELDS.map((field) => <div key={field} className="rounded-md bg-background p-2"><dt className="font-medium">{t(OCR_LABELS[field])}: {result.values[field] ?? t("Not read")}</dt><dd className="break-words text-xs text-muted-foreground">{result.evidence[field]}</dd>{result.warnings[field]?.map((warning) => <dd key={warning} className="text-xs text-amber-700 dark:text-amber-300">{t(warning)}</dd>)}</div>)}</dl>
        <p className="text-xs">{t("Compare every suggestion with the photo. Applying fills untouched empty fields only; saving still requires all required nutrients.")}</p>
        <Button type="button" disabled={busy || !result.unit} onClick={() => onApply(result)}>{t("Apply suggestions to empty fields")}</Button>
      </> : null}
      <Button type="button" variant="outline" onClick={onClose}>{t("Continue manually")}</Button>
    </section>
  );
}
