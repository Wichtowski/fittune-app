/**
 * Retail barcodes in the API's canonical form: 8, 12, 13 or 14 digits with a correct GS1 check
 * digit, UPC-A widened to EAN-13. `null` for anything else, so typos never reach a lookup
 */
export function normalizeBarcode(input: string): string | null {
  const code = input.trim();
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return null;
  const digits = [...code].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);
  if ((10 - (sum % 10)) % 10 !== check) return null;
  return code.length === 12 ? `0${code}` : code;
}
