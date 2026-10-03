import { z } from "zod";

import { extractionSchema, type OcrInput } from "@/schemas/ocr";

import { ApiClient } from "./client";
import {
  daySchema,
  type EntryInput,
  entrySchema,
  lookupSchema,
  mealSchema,
  type ProductInput,
  productSchema,
  type ProfileInput,
  profileSchema,
  searchResultsSchema,
  weightSchema,
} from "@/schemas/health";

/** FitHealth nutrition endpoints under `/api/v1/health`. Arrow fields so they work as `mutationFn` */
class FitHealthClient extends ApiClient {
  constructor() {
    super("/health");
  }

  // Products, shared by everyone
  searchProducts = (q: string, signal?: AbortSignal) =>
    this.request("/products", { schema: searchResultsSchema, query: { q, limit: 20 }, signal });
  /** `code` must already be a valid barcode, see `normalizeBarcode` */
  lookupBarcode = (code: string, signal?: AbortSignal) =>
    this.request(`/products/barcode/${code}`, { schema: lookupSchema, signal });
  createProduct = (input: ProductInput) =>
    this.request("/products", { method: "POST", body: input, schema: productSchema });
  updateProduct = (id: string, input: ProductInput) =>
    this.request(`/products/${id}`, { method: "PUT", body: input, schema: productSchema });

  ocrCapabilities = (signal?: AbortSignal) => this.request("/ocr/capabilities", { schema: z.object({ ai: z.boolean(), rapid: z.boolean() }), signal, trackConnectivity: false });
  parseLabel = (input: OcrInput, signal?: AbortSignal) => this.request("/ocr/parse", { method: "POST", body: input, schema: extractionSchema, signal, trackConnectivity: false });
  extractLabel = (engine: "rapid" | "ai", file: Blob, text: string, column?: number, signal?: AbortSignal) => {
    const body = new FormData();
    body.append("file", file, "label.jpg");
    body.append("text", text);
    if (column !== undefined) body.append("column", String(column));
    return this.request(`/ocr/${engine}`, { method: "POST", body, schema: extractionSchema, timeoutMs: 30_000, signal, trackConnectivity: false });
  };

  // Meals
  getMeals = (signal?: AbortSignal) => this.request("/meals", { schema: z.array(mealSchema), signal });
  createMeal = (name: string) => this.request("/meals", { method: "POST", body: { name }, schema: mealSchema });
  renameMeal = (id: string, name: string) =>
    this.request(`/meals/${id}`, { method: "PATCH", body: { name }, schema: mealSchema });
  reorderMeals = (ids: string[]) =>
    this.request("/meals/order", { method: "PUT", body: { ids }, schema: z.array(mealSchema) });
  deleteMeal = (id: string) => this.request(`/meals/${id}`, { method: "DELETE" });

  // Diary
  getDay = (date: string, tz: string, signal?: AbortSignal) =>
    this.request(`/days/${date}`, { schema: daySchema, query: { tz }, signal });
  putEntry = (id: string, input: EntryInput) =>
    this.request(`/entries/${id}`, { method: "PUT", body: input, schema: entrySchema });
  deleteEntry = (id: string) => this.request(`/entries/${id}`, { method: "DELETE" });

  // Body
  getProfile = (signal?: AbortSignal) => this.request("/profile", { schema: profileSchema, signal });
  saveProfile = (input: ProfileInput) =>
    this.request("/profile", { method: "PUT", body: input, schema: profileSchema });
  getWeights = (signal?: AbortSignal) => this.request("/weights", { schema: z.array(weightSchema), signal });
  saveWeight = (date: string, weight_kg: number) =>
    this.request(`/weights/${date}`, { method: "PUT", body: { weight_kg }, schema: weightSchema });
  deleteWeight = (date: string) => this.request(`/weights/${date}`, { method: "DELETE" });
}

export const fithealth = new FitHealthClient();
