import { describe, expect, test } from "bun:test";
import { loadEntityDefinition } from "./loader";
import { resolve } from "path";

describe("loadEntityDefinition", () => {
  test("loads EntityBase definition", () => {
    const filePath = resolve(__dirname, "definitions/EntityBase.ts");
    const def = loadEntityDefinition(filePath, "EntityBase");

    expect(def).toBeDefined();

    // Check properties
    expect(def.props["name"]).toBe("Entity Base");
    expect(def.props["description"]).toBe("The base of all things.");

    // Check verbs
    expect(def.verbs.has("teleport")).toBe(true);
    expect(def.verbs.has("find")).toBe(true);
    // Verbs map contains compiled S-expressions
    const teleportCode = def.verbs.get("teleport");
    expect(Array.isArray(teleportCode)).toBe(true);
  });
});
