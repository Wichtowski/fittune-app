import { createWorker, OEM, PSM } from "tesseract.js";

import type { OcrInput, Observation } from "@/schemas/ocr";

async function recognize(image: Blob): Promise<OcrInput> {
  const worker = await createWorker(["pol", "eng"], OEM.LSTM_ONLY, {
    workerPath: "/ocr/v6/worker.min.js", corePath: "/ocr/v6", langPath: "/ocr/v6", workerBlobURL: false,
    cacheMethod: "none",
    logger: (message) => { if (message.status === "recognizing text") self.postMessage({ progress: message.progress }); },
    errorHandler: () => self.postMessage({ error: "Could not read this label. Recrop or enter values manually." }),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(image, {}, { blocks: true, text: true });
    const observations: Observation[] = (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words.map((word) => ({
      text: word.text, confidence: Math.max(0, Math.min(1, word.confidence / 100)),
      bbox: [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1] as Observation["bbox"],
    }))))).filter((word) => word.bbox[2] > word.bbox[0] && word.bbox[3] > word.bbox[1]);
    if (observations.length > 1000) throw new Error("Too much text. Crop to the nutrition table.");
    const bitmap = await createImageBitmap(image);
    const input = { width: bitmap.width, height: bitmap.height, observations };
    bitmap.close();
    if (new TextEncoder().encode(JSON.stringify(input)).length > 64 * 1024) throw new Error("Too much text. Crop to the nutrition table.");
    return input;
  } finally {
    await worker.terminate();
  }
}

self.onmessage = async (event: MessageEvent<Blob>) => {
  try {
    self.postMessage({ input: await recognize(event.data) });
  } catch {
    self.postMessage({ error: "Could not read this label. Recrop or enter values manually." });
  }
};
