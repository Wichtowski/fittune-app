import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";

const target = new URL("../public/ocr/v6/", import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(new URL("../node_modules/tesseract.js/dist/worker.min.js", import.meta.url), new URL("worker.min.js", target));
for (const name of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"]) {
  await copyFile(new URL(`../node_modules/tesseract.js-core/${name}`, import.meta.url), new URL(name, target));
}
for (const [language, sha] of [
  ["eng", "7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2"],
  ["pol", "c4476cdbc0e33d898d32345122b7be1cbf85ace15f920f06c7714756e1ef79b2"],
]) {
  const file = new URL(`${language}.traineddata.gz`, target);
  const cached = await readFile(file).catch(() => undefined);
  if (cached && createHash("sha256").update(gunzipSync(cached)).digest("hex") === sha) continue;
  const response = await fetch(`https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/${language}.traineddata`);
  if (!response.ok) throw new Error(`Could not download ${language} OCR data (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== sha) throw new Error(`Checksum mismatch for ${language}`);
  await writeFile(file, gzipSync(bytes));
}
const names = ["worker.min.js", "tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "eng.traineddata.gz", "pol.traineddata.gz"];
const size = (await Promise.all(names.map(async (name) => { const bytes = await readFile(new URL(name, target)); return name.endsWith(".gz") ? bytes.length : gzipSync(bytes).length; }))).reduce((a, b) => a + b, 0);
if (size > 30 * 1024 * 1024) throw new Error("OCR assets exceed the 30 MiB compressed budget");
console.log(`Lazy OCR assets: ${(size / 1024 / 1024).toFixed(2)} MiB compressed`);
