import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  evaluate,
  createScriptContext,
  OPS,
  registerLibrary,
} from "./scripting/interpreter";
import * as Core from "./scripting/lib/core";
import * as ObjectOp from "./scripting/lib/object";
import * as List from "./scripting/lib/list";
import { Entity } from "@viwo/shared/jsonrpc";

// Mock Data
const owner: Entity = { id: 1, name: "Owner" };
const other: Entity = { id: 2, name: "Other" };
const admin: Entity = { id: 3, name: "Admin", admin: true };

const room: Entity = { id: 100, owner: owner.id };
const item: Entity = { id: 101, owner: owner.id, location: room.id };
const unownedItem: Entity = { id: 102, owner: null, location: room.id };
const publicItem: Entity = {
  id: 103,
  owner: owner.id,
  permissions: { edit: true },
};
const sharedItem: Entity = {
  id: 104,
  owner: owner.id,
  permissions: { edit: [other.id] },
};

const entities: Record<number, Entity> = {
  [owner.id]: owner,
  [other.id]: other,
  [admin.id]: admin,
  [room.id]: room,
  [item.id]: item,
  [unownedItem.id]: unownedItem,
  [publicItem.id]: publicItem,
  [sharedItem.id]: sharedItem,
};

// The Script (Copied from seed.ts logic)
const canEditScript = Core["seq"](
  Core["let"]("actor", Core["arg"](0)),
  Core["let"]("target", Core["arg"](1)),
  Core["let"]("type", Core["arg"](2)),
  Core["let"]("allowed", false),

  // 1. Admin Check
  Core["if"](
    ObjectOp["obj.get"](Core["var"]("actor"), "admin", false),
    Core["set"]("allowed", true),
  ),

  // 2. Owner Check
  Core["if"](
    Core["=="](
      ObjectOp["obj.get"](Core["var"]("target"), "owner", null),
      ObjectOp["obj.get"](Core["var"]("actor"), "id", null),
    ),
    Core["set"]("allowed", true),
  ),

  // 3. Explicit Permissions
  Core["let"](
    "perms",
    ObjectOp["obj.get"](Core["var"]("target"), "permissions", null),
  ),
  Core["if"](
    Core["var"]("perms"),
    Core["seq"](
      Core["let"](
        "explicit",
        ObjectOp["obj.get"](Core["var"]("perms"), Core["var"]("type"), null),
      ),
      // Public check
      Core["if"](
        Core["=="](Core["var"]("explicit"), true),
        Core["set"]("allowed", true),
      ),
      // List check
      Core["if"](
        Core["=="](Core["typeof"](Core["var"]("explicit")), "array"),
        Core["if"](
          List["list.includes"](
            Core["var"]("explicit"),
            ObjectOp["obj.get"](Core["var"]("actor"), "id", null),
          ),
          Core["set"]("allowed", true),
        ),
      ),
    ),
  ),

  // 4. Cascading (Location Owner)
  Core["if"](
    Core["not"](Core["var"]("allowed")),
    Core["seq"](
      Core["let"](
        "locId",
        ObjectOp["obj.get"](Core["var"]("target"), "location", null),
      ),
      Core["if"](
        Core["var"]("locId"),
        Core["seq"](
          Core["let"]("loc", Core["entity"](Core["var"]("locId"))),
          Core["if"](
            Core["=="](
              ObjectOp["obj.get"](Core["var"]("loc"), "owner", null),
              ObjectOp["obj.get"](Core["var"]("actor"), "id", null),
            ),
            Core["set"]("allowed", true),
          ),
        ),
      ),
    ),
  ),

  Core["var"]("allowed"),
);

describe("Scripted Permissions", () => {
  registerLibrary(Core);
  registerLibrary(ObjectOp);
  registerLibrary(List);

  let originalEntityHandler: any;

  beforeAll(() => {
    console.log("Registered opcodes:", Object.keys(OPS));

    // Mock 'entity' opcode
    if (!OPS["entity"]) {
      // If entity is not in Core (it might be in another lib or I missed it), define it mock.
      // Core.ts usually has entity?
      // Let's check if it's there.
      console.log("'entity' opcode not found in libraries, defining mock.");
      OPS["entity"] = {
        handler: async ([idExpr], ctx) => {
          const id = await evaluate(idExpr, ctx);
          return entities[id as number] || null;
        },
        metadata: { label: "Entity", category: "data" },
      };
    } else {
      originalEntityHandler = OPS["entity"].handler;
      OPS["entity"].handler = async ([idExpr], ctx) => {
        const id = await evaluate(idExpr, ctx);
        return entities[id as number] || null;
      };
    }
  });

  afterAll(() => {
    OPS["entity"]!.handler = originalEntityHandler;
  });

  const check = async (actor: Entity, target: Entity, type: string) => {
    const ctx = createScriptContext({
      caller: actor,
      this: target, // 'this' doesn't matter much here, but good practice
      args: [actor, target, type],
    });
    return await evaluate(canEditScript, ctx);
  };

  test("Admin Access", async () => {
    expect(await check(admin, item, "edit")).toBe(true);
  });

  test("Owner Access", async () => {
    expect(await check(owner, item, "edit")).toBe(true);
    expect(await check(other, item, "edit")).toBe(false);
  });

  test("Public Access", async () => {
    expect(await check(other, publicItem, "edit")).toBe(true);
  });

  test("Shared Access", async () => {
    expect(await check(other, sharedItem, "edit")).toBe(true);
    expect(await check(admin, sharedItem, "edit")).toBe(true); // Admin still works
    // Create a third user
    const third = { id: 4, name: "Third" };
    expect(await check(third, sharedItem, "edit")).toBe(false);
  });

  test("Cascading Access", async () => {
    // Unowned item in room owned by owner
    expect(await check(owner, unownedItem, "edit")).toBe(true);
    expect(await check(other, unownedItem, "edit")).toBe(false);
  });
});
