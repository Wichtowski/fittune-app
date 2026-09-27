import { describe, expect, it } from "vitest";

import { startingPlace } from "./select";
import type { Place } from "@/schemas/place";

const place = (id: string, version_id = `${id}-v1`): Place => ({ id, version_id, name: id, kind: "custom", equipment: [] });

describe("startingPlace", () => {
  const home = place("home");
  const gym = place("gym", "gym-v2");

  it("prefers the picked place, then the latest workout's place, then the first place", () => {
    expect(startingPlace([home, gym], "home", "gym")).toBe(home);
    expect(startingPlace([home, gym], null, "gym")).toBe(gym);
    expect(startingPlace([home, gym], null, null)).toBe(home);
  });

  it("resolves the latest workout's place to its current version and skips archived places", () => {
    expect(startingPlace([home, gym], null, "gym")?.version_id).toBe("gym-v2");
    expect(startingPlace([home], "archived", "archived")).toBe(home);
  });

  it("returns null until the user has a place", () => {
    expect(startingPlace([], null, "gym")).toBeNull();
  });
});
