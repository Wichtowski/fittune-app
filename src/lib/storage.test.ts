// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { storage } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  storage.removeItem("storage-regression");
});

describe("storage fallback", () => {
  it("reads the latest write when quota prevents localStorage from updating", () => {
    storage.setItem("storage-regression", "old");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    storage.setItem("storage-regression", "new");
    expect(storage.getItem("storage-regression")).toBe("new");
  });

  it("does not revive a removed value after storage access recovers", () => {
    storage.setItem("storage-regression", "old");
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    storage.removeItem("storage-regression");
    remove.mockRestore();
    expect(storage.getItem("storage-regression")).toBeNull();
    storage.setItem("storage-regression", "replacement");
    expect(storage.getItem("storage-regression")).toBe("replacement");
  });

  it("forgets fallback values when removal succeeds", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    storage.setItem("storage-regression", "new");
    storage.removeItem("storage-regression");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    expect(storage.getItem("storage-regression")).toBeNull();
  });
});
