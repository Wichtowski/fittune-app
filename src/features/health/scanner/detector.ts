import type { BarcodeFormat } from "barcode-detector/ponyfill";

/** Product barcodes; QR and other symbologies are ignored */
const FORMATS: BarcodeFormat[] = ["ean_13", "ean_8", "upc_a", "upc_e"];

export type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

type NativeDetectorClass = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats: () => Promise<string[]>;
};

/**
 * The browser's own `BarcodeDetector` when it reads product barcodes (Chrome on Android),
 * otherwise the zxing-wasm ponyfill, loaded only now and with its WASM served from our origin
 */
export async function createDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats();
      if (FORMATS.every((format) => supported.includes(format))) return new Native({ formats: FORMATS });
    } catch {
      // Fall through to the ponyfill
    }
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import("barcode-detector/ponyfill"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
  });
  return new BarcodeDetector({ formats: FORMATS });
}
