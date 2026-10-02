import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWorker, OEM, PSM } from "tesseract.js";

const [manifestPath, cropFolder, outputFolder, segmentation = "11", split = "development"] = process.argv.slice(2);
if (!manifestPath || !cropFolder || !outputFolder) throw new Error("Usage: bun scripts/benchmark-ocr.mjs manifest.json prepared-crops output-observations [psm]");
await mkdir(outputFolder, { recursive: true });
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const worker = await createWorker(["pol", "eng"], OEM.LSTM_ONLY, { langPath: path.resolve("public/ocr/v6"), cacheMethod: "none" });
await worker.setParameters({ tessedit_pageseg_mode: segmentation === "3" ? PSM.AUTO : PSM.SPARSE_TEXT });
try {
  for (const entry of manifest.entries.filter((e) => split === "all" || e.split === split)) {
    const photo = path.join(cropFolder, entry.id + ".jpg");
    const dimensions = JSON.parse(await readFile(path.join(cropFolder, entry.id + ".json"), "utf8"));
    const started = performance.now();
    const { data } = await worker.recognize(photo, {}, { blocks: true, text: true });
    const observations = (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((p) => p.lines.flatMap((line) => line.words.map((word) => ({ text: word.text, confidence: Math.max(0, Math.min(1, word.confidence / 100)), bbox: [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1] })))))
      .filter((o) => o.bbox[2] > o.bbox[0] && o.bbox[3] > o.bbox[1]);
    const payload = { width: dimensions.width, height: dimensions.height, observations };
    await writeFile(path.join(outputFolder, entry.id + ".json"), JSON.stringify(payload));
    const seconds = (performance.now() - started) / 1000;
    await writeFile(path.join(outputFolder, entry.id + ".timing.json"), JSON.stringify({seconds}));
    console.log(`${entry.id}: ${seconds.toFixed(2)}s, ${observations.length} words`);
  }
} finally {
  await worker.terminate();
}
