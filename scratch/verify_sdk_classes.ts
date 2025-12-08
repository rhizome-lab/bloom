import { describe, expect, it } from "bun:test";
import { EntityControl } from "../packages/core/src/runtime/capabilities";

// We can't easily mock `destroyEntityLogic` because it's a direct import.
// However, we can check if EntityControl exists and has the method.

describe("SDK Capability Classes", () => {
  it("should allow instantiating EntityControl", () => {
    const cap = new EntityControl("test-id", 1);
    expect(cap.id).toBe("test-id");
    expect(cap.ownerId).toBe(1);
    expect(cap.__brand).toBe("Capability");
  });

  it("should have destroy method", () => {
    const cap = new EntityControl("test-id", 1);
    expect(typeof cap.destroy).toBe("function");
  });
});
