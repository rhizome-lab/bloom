import { describe, expect, it } from "bun:test";
import { WrappedEntity } from "../packages/core/src/runtime/wrappers";
import { hydrate } from "../packages/core/src/runtime/hydration";
import { EntityControl } from "../packages/core/src/runtime/capabilities";

describe("Hydration System", () => {
  it("should hydrate raw entity to WrappedEntity", () => {
    const raw = { id: 1, prototype_id: null, props: "{}" };
    const hydrated = hydrate(raw);
    expect(hydrated).toBeInstanceOf(WrappedEntity);
    expect((hydrated as WrappedEntity).id).toBe(1);
  });

  it("should hydrate raw capability to EntityControl", () => {
    const raw = { id: "cap-1", type: "viwo.capability.entity_control", owner_id: 1 };
    const hydrated = hydrate(raw);
    expect(hydrated).toBeInstanceOf(EntityControl);
    expect((hydrated as EntityControl).id).toBe("cap-1");
  });

  it("should hydrate array recursively? No, hydrate is single value", () => {
    const list = [{ id: 1 }];
    // core.ts maps hydrate over list
    const hydrated = list.map(hydrate);
    expect(hydrated[0]).toBeInstanceOf(WrappedEntity);
  });
});
