import { expect, it } from "vitest";
import { cropGeometry } from "./image";

it("crops full capture coordinates before applying mobile OCR limits", () => {
  const g = cropGeometry(6000, 4000, { left: 25, top: 10, right: 75, bottom: 90 });
  expect(g).toMatchObject({ x: 1500, y: 400, w: 3000, h: 3200 });
  expect(Math.max(g.width, g.height)).toBeLessThanOrEqual(2048);
  expect(g.width * g.height).toBeLessThanOrEqual(4_000_000);
  expect(g.width / g.height).toBeCloseTo(3000 / 3200, 3);
});
