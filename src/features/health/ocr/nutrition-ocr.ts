import type { OcrInput } from "@/schemas/ocr";

export function recognize(image: Blob, signal: AbortSignal, progress: (value: number) => void): Promise<OcrInput> {
  signal.throwIfAborted();
  const worker = new Worker(new URL("./recognize.worker.ts", import.meta.url), { type: "module" });
  return new Promise((resolve, reject) => {
    const finish = () => { signal.removeEventListener("abort", cancel); worker.terminate(); };
    const cancel = () => { finish(); reject(new DOMException("Extraction cancelled", "AbortError")); };
    signal.addEventListener("abort", cancel, { once: true });
    worker.onerror = () => { finish(); reject(new Error("Could not read this label. Recrop or enter values manually.")); };
    worker.onmessage = (event: MessageEvent<{ progress?: number; input?: OcrInput; error?: string }>) => {
      if (event.data.progress !== undefined) progress(event.data.progress);
      if (event.data.error) { finish(); reject(new Error(event.data.error)); }
      if (event.data.input) { finish(); resolve(event.data.input); }
    };
    worker.postMessage(image);
  });
}
