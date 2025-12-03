import { describe, test, expect, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "./schema";

// Setup in-memory DB
const db = new Database(":memory:");
initSchema(db);

// Mock the db module
mock.module("./db", () => ({ db }));

import {
  evaluate,
  createScriptContext,
  registerLibrary,
  StdLib as Std,
  ObjectLib,
  ListLib as List,
} from "@viwo/scripting";
import { Entity } from "@viwo/shared/jsonrpc";
import {
  createEntity,
  getEntity,
  createCapability,
  getCapabilities,
} from "./repo";
import * as Core from "./runtime/lib/core";
import * as Kernel from "./runtime/lib/kernel";
import { CoreLib } from ".";

describe("Capability Security", () => {
  registerLibrary(Std);
  registerLibrary(ObjectLib);
  registerLibrary(List);
  registerLibrary(Core);
  registerLibrary(Kernel);

  // let sys: Entity;
  let admin: Entity;
  let user: Entity;

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM capabilities").run();
    db.query("DELETE FROM sqlite_sequence").run();

    // Create System
    createEntity({ name: "System" });
    // sys = getEntity(sysId)!;

    // Create Admin (with minting rights)
    const adminId = createEntity({ name: "Admin" });
    admin = getEntity(adminId)!;
    createCapability(adminId, "sys.mint", { namespace: "*" });
    createCapability(adminId, "sys.create", {});
    createCapability(adminId, "entity.control", { "*": true });

    // Create User (no rights initially)
    const userId = createEntity({ name: "User" });
    user = getEntity(userId)!;
  });

  test("Kernel.get_capability", () => {
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    const cap = evaluate(Kernel["get_capability"]("sys.mint"), ctx);
    expect(cap).not.toBeNull();
    expect((cap as any)?.__brand).toBe("Capability");
  });

  test("Kernel.mint", () => {
    // Admin mints a capability for themselves
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    const newCap = evaluate(
      Kernel["mint"](
        Kernel["get_capability"]("sys.mint"),
        "test.cap",
        ObjectLib["obj.new"](),
      ),
      ctx,
    );
    expect(newCap).not.toBeNull();
    expect((newCap as any)?.__brand).toBe("Capability");

    // Verify in DB
    const caps = getCapabilities(admin.id);
    expect(caps.find((c) => c.type === "test.cap")).toBeDefined();
  });

  test("Core.create requires capability", () => {
    // User tries to create without capability
    const ctx = createScriptContext({ caller: user, this: user, args: [] });

    // Should fail because first arg is not capability (it's the object)
    // Or if we pass null/invalid cap
    expect(() =>
      evaluate(CoreLib["create"](ObjectLib["obj.new"](["name", "Fail"])), ctx),
    ).toThrow();
  });

  test("Core.create with capability", () => {
    // Admin creates entity
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    const newId = evaluate(
      CoreLib["create"](
        Kernel["get_capability"]("sys.create"),
        ObjectLib["obj.new"](["name", "Success"]),
      ),
      ctx,
    );
    expect(typeof newId).toBe("number");
  });

  test("Core.set_entity requires capability", () => {
    // Create target
    const targetId = createEntity({ name: "Target" });
    // const target = getEntity(targetId)!;

    // User tries to modify
    const ctx = createScriptContext({ caller: user, this: user, args: [] });
    expect(() =>
      evaluate(
        CoreLib["set_entity"](
          CoreLib["entity"](targetId),
          ObjectLib["obj.new"](["name", "Hacked"]),
        ),
        ctx,
      ),
    ).toThrow();
  });

  test("Core.set_entity with capability", () => {
    const targetId = createEntity({ name: "Target" });

    // Admin has wildcard control
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    evaluate(
      CoreLib["set_entity"](
        Kernel["get_capability"](
          "entity.control",
          ObjectLib["obj.new"](["*", true]),
        ),
        ObjectLib["obj.set"](CoreLib["entity"](targetId), "name", "Modified"),
      ),
      ctx,
    );

    const updated = getEntity(targetId)! as any;
    expect(updated.name).toBe("Modified");
  });
});
