import { describe, it, expect, beforeAll, mock, afterAll } from "bun:test";
import { evaluate } from "./scripting/interpreter";
import { createEntity, addVerb, getVerb } from "./repo";
import { db } from "./db";

describe("Advanced Items Verification", () => {
  beforeAll(() => {
    // Mock sys.broadcast
  });

  afterAll(() => {
    db.query("DELETE FROM entities WHERE name LIKE 'Test%'").run();
  });

  it("should broadcast message", async () => {
    const broadcastMock = mock(() => {});
    const ctx = {
      caller: { id: 1 } as any,
      this: { id: 1 } as any,
      args: [],
      sys: {
        broadcast: broadcastMock,
      },
    } as any;

    await evaluate(["broadcast", "Hello World"], ctx);
    expect(broadcastMock).toHaveBeenCalledWith("Hello World", undefined);

    await evaluate(["broadcast", "Hello Room", 123], ctx);
    expect(broadcastMock).toHaveBeenCalledWith("Hello Room", 123);
  });

  it("should resolve dynamic adjectives", async () => {
    // This logic is in index.ts sendRoom, which is hard to unit test directly without mocking WebSocket.
    // However, we can test the script part.
    const itemId = createEntity({
      name: "Test Dynamic Item",
      kind: "ITEM",
      props: {},
    });

    addVerb(itemId, "get_adjectives", ["list", "color:red", "material:wood"]);

    const verb = getVerb(itemId, "get_adjectives");
    expect(verb).toBeDefined();

    const result = await evaluate(verb!.code, {
      caller: { id: itemId } as any,
      this: { id: itemId } as any,
      args: [],
      sys: {} as any,
    });

    expect(result).toEqual(["color:red", "material:wood"]);
  });
});
