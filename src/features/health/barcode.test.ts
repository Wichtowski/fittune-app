import { expect, it } from "vitest";

import { normalizeBarcode } from "./barcode";

it("accepts EAN-13, EAN-8 and GTIN-14 with a correct check digit", () => {
  expect(normalizeBarcode("5900259127761")).toBe("5900259127761");
  expect(normalizeBarcode(" 96385074 ")).toBe("96385074");
  expect(normalizeBarcode("15900259127768")).toBe("15900259127768");
});

it("widens UPC-A to EAN-13 like the API", () => {
  expect(normalizeBarcode("036000291452")).toBe("0036000291452");
});

it("rejects wrong check digits, lengths and letters", () => {
  for (const code of ["5900259127762", "12345", "59002591277a1", ""]) expect(normalizeBarcode(code)).toBeNull();
});
