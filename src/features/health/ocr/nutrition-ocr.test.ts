import { afterEach, expect, it, vi } from "vitest";
import { recognize } from "./nutrition-ocr";

afterEach(() => vi.unstubAllGlobals());

it("cancels an OCR worker while initialization is still pending", async () => {
  const terminate = vi.fn();
  const postMessage = vi.fn();
  vi.stubGlobal("Worker", class { terminate = terminate; postMessage = postMessage; });
  const controller = new AbortController();
  const pending = recognize(new Blob(["crop"]), controller.signal, vi.fn());
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(terminate).toHaveBeenCalledOnce();
});
